/* eslint-disable complexity */
/* eslint-disable max-depth */
import { Command, flags } from '@oclif/command';
import { lstatSync, readFileSync } from 'fs';
import * as fs from 'fs';
import * as glob from 'glob';
import { format } from 'date-fns';

import { cli } from 'cli-ux';

interface TransactionError {
  run: string;
  transaction: string;
  metric: string;
}

interface ReportAnalysis {
  error: boolean;
  run: string;
  transaction: string;
  metric: string;
  comparator: string;
  runValue: number;
  thresholdValue: number;
}

class JahiaAnalyzePerfsReporter extends Command {
  static description = 'Provide an historical view over multiple run analysis';

  static flags = {
    help: flags.help({ char: 'h' }),
    analysisPath: flags.string({
      description:
        'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    analysisWindow: flags.integer({
      description: 'Number of historical runs to analyze and display',
      default: 6,
      required: false,
    }),
    analysisFailureAlert: flags.integer({
      description:
        'Will trigger an alert if the last X runs were below threshold for a transaction',
      default: 2,
      required: false,
    }),
  };

  async run() {
    const { flags } = this.parse(JahiaAnalyzePerfsReporter);

    if (
      !fs.existsSync(flags.analysisPath) ||
      !lstatSync(flags.analysisPath).isDirectory()
    ) {
      this.log(`Unable to find the following folder: ${flags.analysisPath}`);
      this.exit(1);
    }

    const reportFiles = glob.sync(flags.analysisPath + '/**/*.json', {});

    const reportWindow = reportFiles.sort().slice(-flags.analysisWindow);

    const reports: Array<any> = [];
    // Load all report files in memory
    for (const f of reportWindow) {
      const rawFile = readFileSync(f, 'utf8');
      const jsonReport = JSON.parse(rawFile);
      reports.push(jsonReport);
    }

    // Create an array of all transactions with errors in the report
    const errors: Array<TransactionError> = [];
    const runs: Array<string> = [];
    for (const r of reports) {
      for (const a of r.analysis.filter(
        (a: ReportAnalysis) => a.error === true,
      )) {
        if (!runs.includes(a.run)) {
          runs.push(a.run);
        }
        if (
          errors.find(
            (e) => e.transaction === a.transaction && e.run === a.run,
          ) === undefined
        ) {
          errors.push({
            run: a.run,
            transaction: a.transaction,
            metric: a.metric,
          });
        }
      }
    }

    // Create a table of all values across the specified window
    const errorsTable: Array<any> = errors.map((e) => {
      const transactions = reports.map((r) => {
        return {
          startedAt: r.startedAt,
          analysis: r.analysis.find(
            (a: ReportAnalysis) =>
              e.transaction === a.transaction &&
              e.metric === a.metric &&
              e.run === a.run,
          ),
        };
      });
      return {
        ...e,
        analysis: transactions,
      };
    });

    // Format the data to be displayed in oclif table (https://oclif.io/docs/table)
    // A bit of dirty data wrangling
    let triggerFailure = false;
    for (const run of runs) {
      this.log(`Displaying errors for run: ${run}`);
      // Each run gets its own table
      const currentTransations = errorsTable.filter((e) => e.run === run);
      const columns: any = {
        // oclif table configuration
        transaction: {},
        metric: {},
      };
      // Add one column per report
      for (const a of currentTransations[0].analysis) {
        const currentDate = format(new Date(a.startedAt), 'MM/DD-HH:mm');
        columns[currentDate] = {};
      }
      columns['Send Alert'] = {};
      columns['threshold'] = {};

      const formattedTable = errorsTable
        .filter((e) => e.run === run)
        .map((e) => {
          const row: any = {
            // oclif table row
            transaction: e.transaction,
            metric: e.metric,
          };
          for (const a of e.analysis) {
            const cellValue = Math.round(a.analysis.runValue);
            const currentDate = format(new Date(a.startedAt), 'MM/DD-HH:mm');
            row[currentDate] =
              a.analysis.error === true ? `${cellValue}*` : cellValue
          }
          const alertWindow = e.analysis.slice(-flags.analysisFailureAlert);
          const alertCount = alertWindow.reduce(
            (acc: number, a: any) => acc + (a.analysis.error === true ? 1 : 0),
            0,
          );
          if (alertCount === flags.analysisFailureAlert) {
            triggerFailure = true;
          }
          row['threshold'] =
            e.analysis[e.analysis.length - 1].analysis.thresholdValue;
          row['Send Alert'] =
            alertCount === flags.analysisFailureAlert ? 'YES' : 'NO';
          return row;
        });
      this.log('* (Above threshold)');
      cli.table(formattedTable, columns);
    }

    if (triggerFailure) {
      this.log('Exiting with exit code: 1 (failed)');
      this.exit(1);
    }
  }
}

export = JahiaAnalyzePerfsReporter;
