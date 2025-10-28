import { Command, Flags } from '@oclif/core';
import { format } from 'date-fns';
import * as glob from 'glob';
import { lstatSync, readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import { default as Table } from 'tty-table';

interface TransactionError {
  metric: string;
  run: string;
  transaction: string;
}

interface ReportAnalysis {
  comparator: string;
  error: boolean;
  metric: string;
  run: string;
  runValue: number;
  thresholdValue: number;
  transaction: string;
}

class JahiaAnalyzePerfsReporter extends Command {
  static description = 'Provide an historical view over multiple run analysis';

  static flags = {
    analysisFailureAlert: Flags.integer({
      default: 2,
      description:
        'Will trigger an alert if the last X runs were below threshold for a transaction',
      required: false,
    }),
    analysisPath: Flags.string({
      description:
        'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    analysisWindow: Flags.integer({
      default: 6,
      description: 'Number of historical runs to analyze and display',
      required: false,
    }),
    help: Flags.help({ char: 'h' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaAnalyzePerfsReporter);

    if (
      !fs.existsSync(flags.analysisPath) ||
      !lstatSync(flags.analysisPath).isDirectory()
    ) {
      this.log(`Unable to find the following folder: ${flags.analysisPath}`);
      this.exit(1);
    }

    const reportFiles = glob.sync(flags.analysisPath + '/**/*.json', {});

    const reportWindow = reportFiles.sort().slice(-flags.analysisWindow);

    const reports: Array<{
      analysis: ReportAnalysis[];
      startedAt: string;
    }> = [];
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
          !errors.some(
            (e) => e.transaction === a.transaction && e.run === a.run,
          )
        ) {
          errors.push({
            metric: a.metric,
            run: a.run,
            transaction: a.transaction,
          });
        }
      }
    }

    // Create a table of all values across the specified window
    const errorsTable: Array<
      {
        analysis: Array<{
          analysis?: ReportAnalysis;
          startedAt: string;
        }>;
      } & TransactionError
    > = errors.map((e) => {
      const transactions = reports.map((r) => ({
        analysis: r.analysis.find(
          (a: ReportAnalysis) =>
            e.transaction === a.transaction &&
            e.metric === a.metric &&
            e.run === a.run,
        ),
        startedAt: r.startedAt,
      }));
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
      const currentTransation = errorsTable.find((e) => e.run === run);
      if (!currentTransation) continue;

      const columns: Array<{
        alias?: string;
        align?: string;
        value: string;
      }> = [
        {
          alias: 'Transactions',
          align: 'left',
          value: 'transaction',
        },
        {
          alias: 'Metric',
          value: 'metric',
        },
        // oclif table configuration
      ];
      // Add one column per report
      for (const a of currentTransation.analysis) {
        const currentDate = format(new Date(a.startedAt), 'MM/dd-HH:mm');
        columns.push({
          align: 'right',
          value: currentDate,
        });
      }

      columns.push(
        {
          align: 'right',
          value: 'Send Alert',
        },
        {
          alias: 'Threshold',
          align: 'right',
          value: 'threshold',
        },
      );

      const formattedTable = errorsTable
        .filter((e) => e.run === run)
        .map((e) => {
          const row: Record<string, number | string> = {
            metric: e.metric,
            // oclif table row
            transaction: e.transaction,
          };
          for (const a of e.analysis) {
            const currentDate = format(new Date(a.startedAt), 'MM/dd-HH:mm');
            if (a.analysis === undefined) {
              // The value could be undefined when creating new thresholds
              row[currentDate] = 'N/A';
            } else {
              const cellValue = Math.round(a.analysis.runValue);
              row[currentDate] =
                a.analysis.error === true ? `${cellValue}*` : cellValue;
            }
          }

          const alertWindow = e.analysis.slice(-flags.analysisFailureAlert);
          let alertCount = 0;
          for (const a of alertWindow) {
            if (a.analysis === undefined) continue;
            if (a.analysis.error === true) alertCount++;
          }

          if (alertCount === flags.analysisFailureAlert) {
            triggerFailure = true;
          }

          row.threshold =
            e.analysis.at(-1)?.analysis === undefined
              ? 'N/A'
              : (e.analysis.at(-1)?.analysis?.thresholdValue ?? 'N/A');
          row['Send Alert'] =
            alertCount === flags.analysisFailureAlert ? 'YES' : 'NO';
          return row;
        });
      this.log('* (Above threshold)');

      // eslint-disable-next-line new-cap
      const ANSI = Table(columns, formattedTable).render();
      this.log(ANSI);
    }

    if (triggerFailure) {
      this.log('Exiting with exit code: 1 (failed)');
      this.exit(1);
    }
  }
}

export default JahiaAnalyzePerfsReporter;
