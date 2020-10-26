import {Command, flags} from '@oclif/command'
import {existsSync, lstatSync} from 'fs'
import * as glob from 'glob'
import {TestRailClient} from '../utils/testrail'
import {Project, Section, Suite, Test, AddCase, AddRun, Status, TestRailResult} from '../utils/testrail.interface'
import {parseJson, parseXML} from '../utils/util'
import {formatToTimeZone} from 'date-fns-timezone'

class JahiaTestrailReporter extends Command {
  static description = 'Submit data about a junit report to TestRail'

  static args = [
    {name: 'file',
      required: true,
      description: 'A json/xml report or a folder containing one or multiple json/xml reports'},
    {name: 'username',
      required: true,
      description: 'TestRail username'},
    {name: 'password',
      required: true,
      description: 'TestRail password'},
    {name: 'testrailUrl',
      required: false,
      description: 'TestRail url to submit the results from the report to',
      default: 'https://jahia.testrail.net'},
  ]

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    type: flags.string({
      char: 't',                    // shorter flag version
      description: 'report file type', // help description for flag
      options: ['xml', 'json'],          // only allow the value to be from a discrete set
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
  }

  // eslint-disable-next-line complexity
  async run() {
    const {args, flags} = this.parse(JahiaTestrailReporter)

    if (flags.runName === 'Automated Execution - ') {
      const date = new Date()
      const format = 'YYYY-MM-DD HH:mm:ss [GMT]Z (z)'
      const output = formatToTimeZone(date, format, {timeZone: 'Europe/Paris'})
      flags.runName += output
    }

    const type: string = flags.type === undefined ? 'json/xml' : flags.type
    let jsonFilesList: string[] = []
    let xmlFilesList: string[] = []

    if (!args.file) {
      this.error('Must specify file or folder argument')
    }

    if (!existsSync(args.file)) {
      this.error(`Specified path "${args.file}" does not exist`)
    }

    if (lstatSync(args.file).isDirectory()) {
      this.log(`${args.file} is a folder. Looking for ${type} files:`)
      if (type !== 'xml') {
        jsonFilesList = glob.sync(args.file + '/**/*.json', {})
        // eslint-disable-next-line unicorn/explicit-length-check
        if (jsonFilesList.length) {
          this.log(jsonFilesList.join('\r\n'))
        }
      }
      if (type !== 'json') {
        xmlFilesList = glob.sync(args.file + '/**/*.xml', {})
        // eslint-disable-next-line unicorn/explicit-length-check
        if (xmlFilesList.length) {
          this.log(xmlFilesList.join('\r\n'))
        }
      }

      // We want json OR xml file/s but not both
      // eslint-disable-next-line unicorn/explicit-length-check
      if (type === 'json/xml' && xmlFilesList.length && jsonFilesList.length) {
        this.error(`Two file types were found in ${args.file}. Please specify file type`)
      }

      // Check that at least one report type was found
      if (xmlFilesList.length === undefined && jsonFilesList.length === undefined) {
        this.error(`Failed to find ${type} reports in the folder ${args.file}`)
      }
    } else if (lstatSync(args.file).isFile()) {
      const fileExtension: string = args.file.split('.').pop()
      if (type !== 'xml' && fileExtension === 'json') {
        jsonFilesList.push(fileExtension)
      } else if (type !== 'json' && fileExtension === 'xml') {
        xmlFilesList.push(fileExtension)
      } else {
        this.error(`The flag type ${type} does not match the file provided ${args.file}`)
      }
    } else {
      this.error(`the path ${args.file} is not a file nor a folder`)
    }
    let tests: Test[]
    // Parse files into objects
    if (jsonFilesList.length > 0) {
      tests = parseJson(jsonFilesList)
    } else {
      tests = parseXML(xmlFilesList)
    }

    // Make sure that we have tests
    // eslint-disable-next-line unicorn/explicit-length-check
    if (!tests.length) {
      this.error('Failed to find test results. Check your report.')
    }

    const testrail = new TestRailClient(
      args.testrailUrl,
      args.username,
      args.password
    )

    // get the testrail project
    const testrailProject = testrail.getProjects().find(project => project.name === flags.projectName)
    if (testrailProject === undefined) {
      this.error(`Failed to find project named '${flags.projectName}'`)
    } else {
      testrailProject as Project
    }
    // Get the testrail suite
    const testrailSuite = testrail.getSuites(testrailProject.id).find(suite => suite.name === flags.suiteName)
    if (testrailSuite === undefined) {
      this.error(`Failed to find suite named '${flags.suiteName}' in project '${flags.projectName}'`)
    } else {
      testrailSuite as Suite
    }
    // Get parent section from test rail if parent_section was set
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

    // In order to make sure that all the test cases exist in TestRail we need to first make sure all the sections exist
    const executedSections: Section[] = []
    // Get all sections from the executed tests
    const executedSectionsNames: string[] = [...new Set(tests.map(test => test.section))]
    // Make sure those sections exist in TestRail
    for (const executedSectionName of executedSectionsNames) {
      const foundSectionInTestrail = allSectionsInTestrail.find(sectionInTestrail =>
        sectionInTestrail.name === executedSectionName &&
        (sectionInTestrail.parent_id ? sectionInTestrail.parent_id.toString() : '') === parentSectionId)
      // eslint-disable-next-line no-negated-condition
      if (foundSectionInTestrail !== undefined) {
        executedSections.push(foundSectionInTestrail)
      } else {
        this.log(`Section '${executedSectionName}' wasn't found. Creating it.`)
        executedSections.push(testrail.addSection(testrailProject.id, testrailSuite.id, executedSectionName, parentSectionId))
      }
    }

    // Make sure all test cases exist in TestRail
    // First get all test cases from TestRail, by section
    const testCasesInTestrail: Record<string, Test[]> = {}
    for (const executedSection of executedSections) {
      testCasesInTestrail[executedSection.name] = testrail.getCases(testrailProject.id, testrailSuite.id, executedSection.id)
    }
    // Go over the executed tests and make sure they all exist in the list we just got from TestRail
    for (const test of tests) {
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

    // Get all the case ids. Required for creating the run
    const caseIds = tests.map(t => t.id)

    // Create test run
    const newRun: AddRun = {suite_id: testrailSuite.id,
      name: flags.runName, description: flags.defaultRunDescription, include_all: false, case_ids: caseIds}
    const run = testrail.addRun(testrailProject.id, newRun)
    this.log(`Created test run ${run.id.toString()}`)

    // Create the results object
    const results: TestRailResult[] = []
    for (const test of tests) {
      if (test.id === undefined) {
        this.error(`Something unexpected happened. Test ${test.title} does not have an ID.`)
      } else {
        // If there's a comment argument on the object it means the test failed.
        const status_id: Status = test.comment === undefined ? Status.Passed : Status.Failed
        const testResult: TestRailResult = {case_id: test.id, elapsed: test.time, status_id: status_id, version: flags.jahiaVersion}
        if (status_id === Status.Failed) {
          testResult.comment = test.comment
        }
        results.push(testResult)
      }
    }

    // Bulk update results
    this.log('Updating test run')
    testrail.addResults(run.id, results)
    this.log('Closing test run')
    testrail.closeRun(run.id)
  }
}

export = JahiaTestrailReporter
