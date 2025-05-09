/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import {TestRailClient} from '../utils/testrail'
import {
  Project,
  Section,
  Suite,
  Test,
  AddCase,
  AddRun,
  Run,
  Status,
  TestRailResult,
  ResultField,
} from '../utils/testrail.interface'
import {formatToTimeZone} from 'date-fns-timezone'
import {JRRun, JRTestfailure} from '../global.type'
import ingestReport from '../utils/ingest'
import {cli} from 'cli-ux'
import {lstatSync, readFileSync, existsSync} from 'fs'

interface TestWithStatus extends Test {
  status: string;
}

class JahiaTestrailReporter extends Command {
  static description = 'Submit data about a junit/mocha report to TestRail';

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    sourcePath: flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: flags.string({
      char: 't', // shorter flag version
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json'], // only allow the value to be from a discrete set
      default: 'xml',
    }),
    testrailUrl: flags.string({
      description: 'TestRail url to submit the results from the report to',
      default: 'https://jahia.testrail.net',
    }),
    testrailApiKey: flags.string({
      description: 'TestRail to be used as an alternative to username/password',
      required: false,
    }),
    testrailUsername: flags.string({
      description: 'TestRail username',
      required: true,
    }),
    testrailPassword: flags.string({
      description: 'TestRail password',
      required: true,
    }),
    testrailCustomResultFields: flags.string({
      description: 'Path to a file containing values (in a key:value JSON object) to be added to the result fields',
      default: '',
    }),
    projectName: flags.string({
      char: 'n',
      description: 'TestRail Project name',
      default: 'Jahia',
    }),
    milestone: flags.string({
      char: 'm',
      description: 'TestRail milestone',
      default: 'Default',
    }),
    defaultRunDescription: flags.string({
      char: 'd',
      description: 'TestRail default run description',
      default: 'This test run was manually triggered',
    }),
    runName: flags.string({
      char: 'r',
      description: 'TestRail run name',
      default: 'AE - ',
    }),
    suiteName: flags.string({
      char: 's',
      description: 'TestRail suite name',
      default: 'Master',
    }),
    parentSection: flags.string({
      char: 'p',
      description: 'TestRail default run description',
      default: '',
    }),
    jahiaVersion: flags.string({
      char: 'j',
      description: 'Jahia/Module version',
      default: '8.0.1.0',
    }),
    skip: flags.boolean({
      description: 'Do not send the data but only print it to console',
      default: false,
    }),
    linkRunFile: flags.string({
      description: 'Save the link to the run to a file',
      default: '',
    }),
  };

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaTestrailReporter)

    if (flags.runName === 'AE - ') {
      const date = new Date()
      const format = 'YYYY-MM-DD HH:mm:ss [GMT]Z (z)'
      const runDate = formatToTimeZone(date, format, {
        timeZone: 'Europe/Paris',
      })
      if (flags.parentSection === '') {
        flags.runName += `${flags.projectName}-${runDate}`
      } else {
        flags.runName += `${flags.parentSection}-${runDate}`
      }
    }

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log,
    )
    const tests: TestWithStatus[] = []
    for (const report of jrRun.reports) {
      this.log(`- Analyzed report: ${report.name}`)
      for (const testsuite of report.testsuites) {
        this.log(`   |- Analyzed suite: ${testsuite.name}`)
        for (const test of testsuite.tests) {
          if (!test.name.includes('hook for')) {
            const sectionName = testsuite.name.includes('(') ?
              testsuite.name.substring(0, testsuite.name.indexOf('(') - 1) :
              testsuite.name
            const testName = test.name.includes(sectionName) ?
              test.name.substring(sectionName.length + 1) :
              test.name
            const testToPush: TestWithStatus = {
              section: sectionName.trim(),
              title: testName.trim(),
              time: test.time.toString(),
              steps: test.steps,
              status: test.status,
            }
            if (test.failures.length > 0) {
              testToPush.comment =
                test.failures.filter((f: JRTestfailure) => f !== undefined).map((f: JRTestfailure) => f.text).join() ||
                test.failures.join()
            }
            this.log(
              `   |    |- Analyzed test: ${test.name} - Status: ${test.status}`,
            )
            tests.push(testToPush)
          }
        }
      }
    }

    const testrail = new TestRailClient(
      flags.testrailUrl,
      flags.testrailUsername,
      flags.testrailApiKey === undefined ? flags.testrailPassword : flags.testrailApiKey
    )

    this.log('Get all testrail projects')
    // get the testrail project
    const testrailProject = testrail
    .getProjects()
    .find(project => project.name === flags.projectName)
    if (testrailProject === undefined) {
      this.error(`Failed to find project named '${flags.projectName}'`)
    } else {
      testrailProject as Project
    }
    // Get the testrail suite
    this.log(`Get all suites for project ${testrailProject.id}`)
    const testrailSuite = testrail
    .getSuites(testrailProject.id)
    .find(suite => suite.name === flags.suiteName)
    if (testrailSuite === undefined) {
      this.error(
        `Failed to find suite named: '${flags.suiteName}' in project: '${flags.projectName}'`,
      )
    } else {
      testrailSuite as Suite
    }
    // Get parent section from test rail if parent_section was set
    this.log(
      `Get all sections for project: ${testrailProject.id} and suite: ${testrailSuite.id}`,
    )
    let allSectionsInTestrail = testrail.getSections(
      testrailProject.id,
      testrailSuite.id,
    )
    let parentSectionId = ''
    if (flags.parentSection !== '') {
      let foundSection = allSectionsInTestrail.find(
        section => section.name === flags.parentSection,
      )
      if (foundSection === undefined) {
        this.log(
          `Failed to find section named '${flags.parentSection}' in project '${flags.projectName}'. Creating the section now.`,
        )
        foundSection = testrail.addSection(
          testrailProject.id,
          testrailSuite.id,
          flags.parentSection,
        )
        allSectionsInTestrail = testrail.getSections(
          testrailProject.id,
          testrailSuite.id,
        )
      }
      parentSectionId = foundSection.id.toString()
    }

    // Get Milestone
    this.log(`Get all milestones for project: ${testrailProject.id}`)
    const milestone: any = testrail
    .getMilestones(testrailProject.id)
    .find(milestone => milestone.name === flags.milestone)
    let milestone_id = -1
    if (flags.skip) {
      this.log(`Milestone: ${flags.milestone}`)
    } else {
      this.log(
        `Add milestone to project: ${testrailProject.id}, milestone: ${flags.milestone}`,
      )
      milestone_id = milestone ?
        milestone.id :
        testrail.addMilestone(testrailProject.id, flags.milestone).id
    }
    this.log(`Using milestone ${flags.milestone} with id: ${milestone_id}`)

    let testrailCustomFields: ResultField[] = []
    if (flags.testrailCustomResultFields !== undefined && flags.testrailCustomResultFields !== '') {
      // Parse the provided json file
      if (!existsSync(flags.testrailCustomResultFields)) {
        throw new Error(`Something went wrong. The provided path: ${flags.testrailCustomResultFields} does not exist.`)
      }
      if (!lstatSync(flags.testrailCustomResultFields).isFile()) {
        throw new Error(`Something went wrong. The provided path: ${flags.testrailCustomResultFields} is not a file`)
      }
      this.log(`${flags.testrailCustomResultFields}, exists, parsing its content`)
      const rawFile = readFileSync(flags.testrailCustomResultFields, 'utf8')
      const customFieldsSubmission = JSON.parse(rawFile.toString())

      // Get all configured Testrail custom fields for that account
      // Decorate it with value and project details
      this.log('Get all configured custom fields')
      testrailCustomFields = testrail.getResultFields().map(t => {
        // See static type list here: https://support.gurock.com/hc/en-us/articles/7077871398036-Result-Fields
        const staticTypes = ['', 'String', 'Integer', 'Text', 'URL', 'Checkbox', 'Dropdown', 'User', 'Date', 'Milestone', 'Step Results', 'Multi-select']
        let isEnabledOnProject = false
        t.configs.forEach(c => {
          if (c.context.is_global === true || c.context.project_ids.includes(testrailProject.id)) {
            isEnabledOnProject = true
          }
        })
        // Search in the submission to find a match
        return {
          ...t,
          type: staticTypes[t.type_id],
          enabledOnProject: isEnabledOnProject, // Is that custom field valid for the current project
          value: customFieldsSubmission[t.system_name],
        }
      })
      // Finally, add the system fields (if present in the json file)
      if (customFieldsSubmission.version !== undefined) {
        testrailCustomFields.push({
          id: 1000,
          is_active: true,
          type_id: 1,
          name: 'Version (System)',
          system_name: 'version',
          label: 'Version',
          description: 'Version (System field)',
          configs: [],
          display_order: 1,
          include_all: 1,
          template_ids: [],
          type: 'String',
          enabledOnProject: true,
          value: customFieldsSubmission.version,
        })
      }
      this.log('The following custom fields are present on testrail:')
      cli.table(testrailCustomFields, {id: {}, system_name: {}, type: {},  enabledOnProject: {}, value: {}, description: {}})
      testrailCustomFields = testrailCustomFields.filter(f => f.enabledOnProject === true)
    }

    // In order to make sure that all the test cases exist in TestRail we need to first make sure all the sections exist
    const executedSections: Section[] = []
    // Get all sections from the executed tests
    const executedSectionsNames: string[] = [
      ...new Set(tests.map(test => test.section)),
    ]
    this.log('The following section names were found')
    for (const sectionName of executedSectionsNames) {
      this.log(sectionName)
    }

    // Make sure those sections exist in TestRail
    for (const executedSectionName of executedSectionsNames) {
      const foundSectionInTestrail = allSectionsInTestrail.find(
        sectionInTestrail =>
          sectionInTestrail.name === executedSectionName &&
          (sectionInTestrail.parent_id ?
            sectionInTestrail.parent_id.toString() :
            '') === parentSectionId,
      )
      // eslint-disable-next-line no-negated-condition
      if (foundSectionInTestrail !== undefined) {
        executedSections.push(foundSectionInTestrail)
      } else {
        this.log(
          `Section '${executedSectionName}' wasn't found. Creating it (project ID: ${testrailProject.id}, suite ID: ${testrailSuite.id}, section name: ${executedSectionName}, parent section ID: ${parentSectionId}).`,
        )
        if (!flags.skip) {
          executedSections.push(
            testrail.addSection(
              testrailProject.id,
              testrailSuite.id,
              executedSectionName,
              parentSectionId,
            ),
          )
        }
      }
    }

    // Make sure all test cases exist in TestRail
    // First get all test cases from TestRail, by section
    const testCasesInTestrail: Record<string, Test[]> = {}
    for (const executedSection of executedSections) {
      if (!flags.skip) {
        this.log(
          `Get cases for project: ${testrailProject.id}, suite: ${testrailSuite.id}, section: ${executedSection.id}`,
        )
        testCasesInTestrail[executedSection.name] = testrail.getCases(
          testrailProject.id,
          testrailSuite.id,
          executedSection.id,
        )
      }
    }
    // Go over the executed tests and make sure they all exist in the list we just got from TestRail
    for (const test of tests) {
      if (flags.skip) {
        this.log(`Get test data ${JSON.stringify(test)}`)
      } else {
        // See if test exists in TestRail
        const foundTestCaseInTestRail = testCasesInTestrail[test.section].find(
          t => t.title === test.title,
        )
        // if it's not found we are creating it
        if (foundTestCaseInTestRail === undefined) {
          this.log(
            `Test '${test.title}' was not found in TestRail. Creating it.`,
          )
          const newTestCase: AddCase = {
            title: test.title,
            custom_status: testrail.getCustomStatus('Complete'),
            custom_version: testrail.getCustomVersion('8.0.1.0'),
          }
          // Only Cypress reports at the moment are expected to have the steps field
          if (test.steps !== undefined) {
            newTestCase.custom_steps_separated = new Array({
              content: test.steps,
              expected: '',
            })
          }
          // Find the section ID of that that test belongs to
          const section = executedSections.find(
            section => section.name === test.section,
          )
          if (section === undefined) {
            this.error(
              `Something unexpected happened. Section ${test.section} was not found and not created.`,
            )
          } else {
            test.id = testrail.addCase(section.id, newTestCase).id
          }
        } else {
          // the test exists in TestRail, so we'll just keep the ID
          test.id = foundTestCaseInTestRail.id
        }
      }
    }

    // Get all the case ids. Required for creating the run
    const caseIds = tests.map(t => t.id)

    // Create test run
    const newRun: AddRun = {
      suite_id: testrailSuite.id,
      name: flags.runName,
      description: flags.defaultRunDescription,
      milestone_id: milestone_id,
      include_all: false,
      case_ids: caseIds,
    }
    let run = {} as Run
    if (flags.skip) {
      this.log(`Created test run ${flags.runName}`)
    } else {
      run = testrail.addRun(testrailProject.id, newRun)
      this.log(
        `Created test run ${run.id.toString()} (https://jahia.testrail.net/index.php?/runs/view/${run.id.toString()})`,
      )
      if (flags.linkRunFile !== '') {
        fs.writeFileSync(
          flags.linkRunFile,
          `https://jahia.testrail.net/index.php?/runs/view/${run.id.toString()}`,
        )
      }
    }

    // Create the results object
    const results: TestRailResult[] = []
    for (const test of tests) {
      if (test.id === undefined) {
        this.error(
          `Something unexpected happened. Test ${test.title} does not have an ID.`,
        )
      } else {
        // If there's a comment argument on the object it means the test failed.
        let status_id: Status = 5
        if (test.status === 'PASS') {
          status_id = 1
        } else if (['SKIP', 'PENDING'].includes(test.status)) {
          // Passing status "blocked" since `3: Untested ` is not supported
          // See: https://www.gurock.com/testrail/docs/api/reference/results/#addresult
          status_id = 2
        }
        // const status_id: Status = test.comment === undefined ? Status.Passed : Status.Failed
        const testResult: any = {
          case_id: test.id,
          elapsed: test.time,
          status_id: status_id,
          version: flags.jahiaVersion,
        }
        if (status_id === Status.Failed) {
          testResult.comment = test.comment
        }
        this.log(
          `Puhsing to testrail - Title: ${test.title} - case_id: ${test.id} - status_id: ${status_id}`,
        )

        // Adding custom fields when applicable
        if (testrailCustomFields.length > 0) {
          testrailCustomFields.forEach(f => {
            testResult[f.system_name] = f.value
          })
        }
        results.push(testResult)
      }
    }

    // Bulk update results
    this.log('Updating test run')
    if (flags.skip) {
      this.log(`Results: ${JSON.stringify(results)}`)
    } else {
      testrail.addResults(run.id, results)
    }
    this.log('Closing test run')
    if (!flags.skip) {
      testrail.closeRun(run.id)
    }
  }
}

export = JahiaTestrailReporter;
