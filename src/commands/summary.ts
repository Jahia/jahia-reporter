/* eslint max-depth: ["error", 5] */
import { Command, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { JRRun } from '../global.type';
import ingestReport from '../utils/ingest/index.js';

export default class SummaryCommand extends Command {
  static override description = 'Display a summary of the test results';

  static override flags = {
    savePath: Flags.string({
      default: '',
      description: 'Path to save the report as JSON',
    }),
    silent: Flags.boolean({
      char: 's',
      default: false,
      description:
        'Should report ingestion be silent (not to display identified files)',
    }),
    sourcePath: Flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't', // shorter flag version
      default: 'xml',
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json'], // only allow the value to be from a discrete set
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(SummaryCommand);

    // Extract a report object from the actual report files (either XML or JSON)
    const report: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log,
      flags.silent,
    );

    if (flags.savePath !== '') {
      fs.writeFileSync(path.join(flags.savePath), JSON.stringify(report));
    }

    const testTotal = report.tests;
    let testFailures = report.failures;
    const testSkipped = report.skipped;
    const testPending = report.pending;

    // There are times at which the failures might actually be negatives due to skipped tests
    // In such cases, we put the failures back to 0
    if (
      flags.sourceType === 'xml' &&
      testSkipped > 0 &&
      testFailures < 0 &&
      testFailures + testSkipped === 0
    ) {
      testFailures = 0;
    }

    this.log(
      `Total Tests: ${testTotal} - Failure: ${testFailures} (skipped: ${testSkipped}, pending: ${testPending})- Executed in ${report.time}s`,
    );
    if (report.failures > 0) {
      this.log('FAILURES:');
      for (const r of report.reports.filter((r) => r.failures > 0)) {
        this.log(
          ` | Suite: ${r.name} - Total tests: ${r.tests} - Failure: ${r.failures} - Executed in ${r.time}s`,
        );
        for (const s of r.testsuites.filter((s) => s.failures > 0)) {
          this.log(` |   | - ${s.name}`);
          for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
            this.log(` |   |    | - FAIL: ${t.name}`);
          }
        }
      }
    }

    // Skipped and Pending are only supported for JSON reports
    if (flags.sourceType === 'json') {
      if (report.skipped > 0) {
        this.log('SKIPPED:');
        for (const r of report.reports.filter((r) => r.skipped > 0)) {
          this.log(
            ` | Suite: ${r.name} - Total tests: ${r.tests} - Skipped: ${r.skipped} - Executed in ${r.time}s`,
          );
          for (const s of r.testsuites.filter((s) => s.skipped > 0)) {
            this.log(` |   | - ${s.name}`);
            for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
              this.log(` |   |    | - SKIPPED: ${t.name}`);
            }
          }
        }
      }

      if (report.pending > 0) {
        this.log('PENDING:');
        for (const r of report.reports.filter((r) => r.pending > 0)) {
          this.log(
            ` | Suite: ${r.name} - Total tests: ${r.tests} - Pending: ${r.pending} - Executed in ${r.time}s`,
          );
          for (const s of r.testsuites.filter((s) => s.pending > 0)) {
            this.log(` |   | - ${s.name}`);
            for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
              this.log(` |   |    | - PENDING: ${t.name}`);
            }
          }
        }
      }
    }
  }
}
