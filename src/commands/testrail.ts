/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {TestRailClient} from '../utils/testrail'
import {Project, Section, Suite, Test, AddCase, AddRun, Run, Status, TestRailResult} from '../utils/testrail.interface'
import {formatToTimeZone} from 'date-fns-timezone'
import {JRRun, JRTestfailure} from '../global.type'
import ingestReport from '../utils/ingest'

class JahiaTestrailReporter extends Command {
  static description = 'Submit data about a junit/mocha report to TestRail'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    sourcePath: flags.string({
      description: 'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: flags.string({
      char: 't',                        // shorter flag version
      description: 'The format of the report',  // help description for flag
      options: ['xml', 'json'],         // only allow the value to be from a discrete set
      default: 'xml',
    }),
    testrailUrl: flags.string({
      description: 'TestRail url to submit the results from the report to',
      default: 'https://jahia.testrail.net',
    }),
    testrailUsername: flags.string({
      description: 'TestRail username',
      required: true,
    }),
    testrailPassword: flags.string({
      description: 'TestRail password',
      required: true,
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
      default: 'Automated Execution - ',
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
  }

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaTestrailReporter)

    if (flags.runName === 'Automated Execution - ') {
      const date = new Date()
      const format = 'YYYY-MM-DD HH:mm:ss [GMT]Z (z)'
      const output = formatToTimeZone(date, format, {timeZone: 'Europe/Paris'})
      flags.runName += output
    }

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(flags.sourceType, flags.sourcePath, this.log)
    const tests: Test[] = []
    for (const report of jrRun.reports) {
      for (const testsuite of report.testsuites) {
        for (const test of testsuite.tests) {
          if (!test.name.includes('hook for')) {
            const sectionName = testsuite.name.includes('(') ? testsuite.name.substring(0, testsuite.name.indexOf('(') - 1) : testsuite.name
            const testName = test.name.includes(sectionName) ?
              test.name.substring(sectionName.length + 1) :
              test.name
            const testToPush: Test = {section: sectionName.trim(), title: testName.trim(), time: test.time.toString(), steps: test.steps}
            if (test.failures.length > 0) {
              testToPush.comment = test.failures.map((f: JRTestfailure) => f.text).join() || test.failures.join()
            }
            tests.push(testToPush)
          }
        }
      }
    }

    const testrail = new TestRailClient(
      flags.testrailUrl,
      flags.testrailUsername,
      flags.testrailPassword
    )

    this.log('Get all testrail projects')
    // get the testrail project
    const testrailProject = testrail.getProjects().find(project => project.name === flags.projectName)
    if (testrailProject === undefined) {
      this.error(`Failed to find project named '${flags.projectName}'`)
    } else {
      testrailProject as Project
    }
    // Get the testrail suite
    this.log(`Get all suites for project ${testrailProject.id}`)
    const testrailSuite = testrail.getSuites(testrailProject.id).find(suite => suite.name === flags.suiteName)
    if (testrailSuite === undefined) {
      this.error(`Failed to find suite named: '${flags.suiteName}' in project: '${flags.projectName}'`)
    } else {
      testrailSuite as Suite
    }
    // Get parent section from test rail if parent_section was set
    this.log(`Get all sections for project: ${testrailProject.id} and suite: ${testrailSuite.id}`)
    const allSectionsInTestrail = testrail.getSections(testrailProject.id, testrailSuite.id)
    let parentSectionId = ''
    if (flags.parentSection !== '') {
      const foundSection = allSectionsInTestrail.find(section => section.name === flags.parentSection)
      if (foundSection === undefined) {
        this.error(`Failed to find section named '${flags.parentSection}' in project '${flags.projectName}'`)
      } else {
        parentSectionId = foundSection.id.toString()
      }
    }

    // Get Milestone
    this.log(`Get all milestones for project: ${testrailProject.id}`)
    const milestone: any = testrail.getMilestones(testrailProject.id).find(milestone => milestone.name === flags.milestone)
    let milestone_id = -1
    if (flags.skip) {
      this.log(`Milestone: ${flags.milestone}`)
    } else {
      this.log(`Add milestone to project: ${testrailProject.id}, milestone: ${flags.milestone}`)
      milestone_id = milestone ? milestone.id : testrail.addMilestone(testrailProject.id, flags.milestone).id
    }
    this.log(`Using milestone ${flags.milestone} with id: ${milestone_id}`)

    // In order to make sure that all the test cases exist in TestRail we need to first make sure all the sections exist
    const executedSections: Section[] = []
    // Get all sections from the executed tests
    const executedSectionsNames: string[] = [...new Set(tests.map(test => test.section))]
    this.log('The following section names were found')
    for (const sectionName of executedSectionsNames) {
      this.log(sectionName)
    }

    // Make sure those sections exist in TestRail
    for (const executedSectionName of executedSectionsNames) {
      const foundSectionInTestrail = allSectionsInTestrail.find(sectionInTestrail =>
        sectionInTestrail.name === executedSectionName &&
        (sectionInTestrail.parent_id ? sectionInTestrail.parent_id.toString() : '') === parentSectionId)
      // eslint-disable-next-line no-negated-condition
      if (foundSectionInTestrail !== undefined) {
        executedSections.push(foundSectionInTestrail)
      } else {
        this.log(`Section '${executedSectionName}' wasn't found. Creating it (project ID: ${testrailProject.id}, suite ID: ${testrailSuite.id}, section name: ${executedSectionName}, parent section ID: ${parentSectionId}).`)
        if (!flags.skip) {
          executedSections.push(testrail.addSection(testrailProject.id, testrailSuite.id, executedSectionName, parentSectionId))
        }
      }
    }

    // Make sure all test cases exist in TestRail
    // First get all test cases from TestRail, by section
    const testCasesInTestrail: Record<string, Test[]> = {}
    for (const executedSection of executedSections) {
      if (!flags.skip) {
        this.log(`Get cases for project: ${testrailProject.id}, suite: ${testrailSuite.id}, section: ${executedSection.id}`)
        testCasesInTestrail[executedSection.name] = testrail.getCases(testrailProject.id, testrailSuite.id, executedSection.id)
      }
    }
    // Go over the executed tests and make sure they all exist in the list we just got from TestRail
    for (const test of tests) {
      if (flags.skip) {
        this.log(`Get test data ${JSON.stringify(test)}`)
      } else {
        // See if test exists in TestRail
        const foundTestCaseInTestRail = testCasesInTestrail[test.section].find(t => t.title === test.title)
        // if it's not found we are creating it
        if (foundTestCaseInTestRail === undefined) {
          this.log(`Test '${test.title}' was not found in TestRail. Creating it.`)
          const newTestCase: AddCase = {title: test.title,
            custom_status: testrail.getCustomStatus('Complete'),
            custom_version: testrail.getCustomVersion('8.0.1.0')}
          // Only Cypress reports at the moment are expected to have the steps field
          if (test.steps !== undefined) {
            newTestCase.custom_steps_separated = new Array({content: test.steps, expected: ''})
          }
          // Find the section ID of that that test belongs to
          const section = executedSections.find(section => section.name === test.section)
          if (section === undefined) {
            this.error(`Something unexpected happened. Section ${test.section} was not found and not created.`)
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
    const newRun: AddRun = {suite_id: testrailSuite.id,
      name: flags.runName,
      description: flags.defaultRunDescription,
      milestone_id: milestone_id,
      include_all: false,
      case_ids: caseIds}
    let run = {} as Run
    if (flags.skip) {
      this.log(`Created test run ${flags.runName}`)
    } else {
      run = testrail.addRun(testrailProject.id, newRun)
      this.log(`Created test run ${run.id.toString()}`)
    }

    // Create the results object
    const results: TestRailResult[] = []
    for (const test of tests) {
      if (test.id === undefined) {
        this.error(`Something unexpected happened. Test ${test.title} does not have an ID.`)
      } else {
        // If there's a comment argument on the object it means the test failed.
        // const status_id: Status = test.comment === undefined ? Status.Passed : Status.Failed
        const status_id: Status = test.status === 'PASS' ? Status.Passed : Status.Failed
        this.log(`Test: ${test.title} - Status: ${test.status} (${status_id})`)
        const testResult: TestRailResult = {case_id: test.id, elapsed: test.time, status_id: status_id, version: flags.jahiaVersion}
        if (status_id === Status.Failed) {
          testResult.comment = test.comment
        }
        this.log(`Added result: ${JSON.stringify(testResult)}`)
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

export = JahiaTestrailReporter
