/* eslint max-depth: ["error", 5] */
import { Command, Flags } from '@oclif/core';

import { JRRun } from '../../types/index.js';
import ingestReport from '../../utils/ingest/index.js';

class JahiaCheckReport extends Command {
  static description = 'Submit data about a junit/mocha report to TestRail';
static flags = {
    help: Flags.help({ char: 'h' }),
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
    // add --version flag to show CLI version
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaCheckReport);

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
    );

    this.log(
      `Root Stats => Tests: ${jrRun.tests} Failures: ${jrRun.failures} Time: ${jrRun.time} Reports count: ${jrRun.reports.length}`,
    );
    for (const [idx, report] of jrRun.reports.entries()) {
      this.log(
        `[${idx}] Report: ${report.name} => Tests: ${report.tests} Failures: ${report.failures} Time: ${report.time} Suites count: ${report.testsuites.length}`,
      );
      for (const [idxsuite, suite] of report.testsuites.entries()) {
        this.log(
          `[${idx}][${idxsuite}] Suite: ${suite.name} => Failures: ${suite.failures} Time: ${suite.time} Timestamp: ${suite.timestamp} Tests count: ${suite.tests.length}`,
        );
        for (const [idxtest, test] of suite.tests.entries()) {
          this.log(
            `[${idx}][${idxsuite}][${idxtest}] Test: ${test.name} => Failures: ${test.failures.length} Time: ${test.time} Status: ${test.status}`,
          );
        }
      }
    }
  }
}

export default JahiaCheckReport;
