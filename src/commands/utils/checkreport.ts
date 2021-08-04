/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {JRRun} from '../../global.type'
import ingestReport from '../../utils/ingest'

class JahiaCheckReport extends Command {
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
  }

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaCheckReport)

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(flags.sourceType, flags.sourcePath, this.log)

    this.log(`Root Stats => Tests: ${jrRun.tests} Failures: ${jrRun.failures} Time: ${jrRun.time} Reports count: ${jrRun.reports.length}`)
    for (const [idx, report] of jrRun.reports.entries()) {
      this.log(`[${idx}] Report: ${report.name} => Tests: ${report.tests} Failures: ${report.failures} Time: ${report.time} Suites count: ${report.testsuites.length}`)
      for (const [idxsuite, suite] of report.testsuites.entries()) {
        this.log(`[${idx}][${idxsuite}] Suite: ${suite.name} => Failures: ${suite.failures} Time: ${suite.time} Timestamp: ${suite.timestamp} Tests count: ${suite.tests.length}`)
        for (const [idxtest, test] of suite.tests.entries()) {
          this.log(`[${idx}][${idxsuite}][${idxtest}] Test: ${test.name} => Failures: ${test.failures.length} Time: ${test.time} Status: ${test.status}`)
        }
      }
    }
  }
}

export = JahiaCheckReport
