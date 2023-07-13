import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import * as path from 'path'

import ingestReport from '../utils/ingest'

class JahiaSummaryReporter extends Command {
  static description = 'Display a summary of the test results';

  static flags = {
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
    savePath: flags.string({
      description:
        'Path to save the report as JSON',
      default: '',
    }),    
    silent: flags.boolean({
      char: 's',
      description:
        'Should report ingestion be silent (not to display identified files)',
      default: false,
    }),
  };

  async run() {
    const {flags} = this.parse(JahiaSummaryReporter)

    // Extract a report object from the actual report files (either XML or JSON)
    const report = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log,
      flags.silent,
    )

    if (flags.savePath !== '') {
      fs.writeFileSync(
        path.join(flags.savePath),
        JSON.stringify(report)
      )      
    }

    const testTotal = report.tests
    let testFailures = report.failures
    const testSkipped = report.skipped

    // There are times at which the failures might actually be negatives due to skipped tests
    // In such cases, we put the failures back to 0
    if (testSkipped > 0 && testFailures < 0 && testFailures + testSkipped === 0) {
      testFailures = 0
    }

    this.log(
      `Total Tests: ${testTotal} - Failure: ${testFailures} (skipped: ${testSkipped})- Executed in ${report.time}s`,
    )
    if (report.failures > 0) {
      this.log('FAILURES:')
      for (const r of report.reports.filter(r => r.failures > 0)) {
        this.log(
          ` | Suite: ${r.name} - Total tests: ${r.tests} - Failure: ${r.failures} - Executed in ${r.time}s`,
        )
        for (const s of r.testsuites.filter(s => s.failures > 0)) {
          this.log(` |   | - ${s.name}`)
          for (const t of s.tests.filter(t => t.status === 'FAIL')) {
            this.log(` |   |    | - FAIL: ${t.name}`)
          }
        }
      }
    }
    // console.log(report);
  }
}

export = JahiaSummaryReporter;
