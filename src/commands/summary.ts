import {Command, flags} from '@oclif/command'

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
    this.log(
      `Total Tests: ${report.tests} - Failure: ${report.failures} - Executed in ${report.time}s`,
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
