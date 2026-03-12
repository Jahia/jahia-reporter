/* eslint-disable complexity */
/* eslint-disable max-depth */
import { Command, Flags } from '@oclif/core';
import { readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import path from 'node:path';

import {
  JMeterExec,
  JMeterExecAnalysisReport,
  JMeterRunTransaction,
  JMeterThresholds,
  JMeterTRunTransaction,
} from '../../types/index.js';

const getRunThreshold = (runName: string, thresholds: JMeterThresholds) => {
  // First use exact match
  let runThreshold = thresholds.runs.find((t) => t.name === runName);
  if (runThreshold !== undefined) {
    return runThreshold;
  }

  // Second, try partial match, returning the first matching record
  runThreshold = thresholds.runs.find((t) =>
    runName.toLowerCase().includes(t.name.toLowerCase()),
  );
  if (runThreshold !== undefined) {
    return runThreshold;
  }

  // Lastly, try returning "*" match or undefined if none found
  runThreshold = thresholds.runs.find((t) => t.name === '*');
  return runThreshold;
};

const getTransactionThreshold = (
  runRransactionName: string,
  thresholdtransactions: JMeterTRunTransaction[],
) => {
  let transactionThreshold = thresholdtransactions.find(
    (t) => t.name === runRransactionName,
  );
  if (transactionThreshold !== undefined) {
    return transactionThreshold;
  }

  transactionThreshold = thresholdtransactions.find((t) =>
    runRransactionName.toLowerCase().includes(t.name.toLowerCase()),
  );
  if (transactionThreshold !== undefined) {
    return transactionThreshold;
  }

  transactionThreshold = thresholdtransactions.find((t) => t.name === '*');
  return transactionThreshold;
};

class JahiaAnalyzePerfsReporter extends Command {
  static description =
    'Analyze a runs file against values included in a threshold file.';
  static flags = {
    failOnError: Flags.boolean({
      default: false,
      description: 'Should the system send an exit signal in case of failure',
    }),
    help: Flags.help({ char: 'h' }),
    reportFile: Flags.string({
      default: '',
      description:
        'A path to store the JSON report that will be generated at the end of the run (full report)',
      required: false,
    }),
    runsFile: Flags.string({
      description:
        'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    thresholdsFile: Flags.string({
      description: 'A json file containing values thresholds',
      required: true,
    }),
    verbose: Flags.boolean({
      default: false,
      description: 'Display more log messages',
    }),
  };

  async run() {
    const { flags } = await this.parse(JahiaAnalyzePerfsReporter);

    if (!fs.existsSync(flags.runsFile)) {
      this.log(`Unable to read runsFile at: ${flags.runsFile}`);
      this.exit(1);
    }

    const rawFileJmeter = readFileSync(flags.runsFile, 'utf8');
    const jMeterRuns: JMeterExec = JSON.parse(rawFileJmeter.toString());

    if (!fs.existsSync(flags.thresholdsFile)) {
      this.log(`Unable to read thresholdsFile at: ${flags.thresholdsFile}`);
      this.exit(1);
    }

    const rawFileThresholds = readFileSync(flags.thresholdsFile, 'utf8');
    const jMeterThresholds: JMeterThresholds = JSON.parse(
      rawFileThresholds.toString(),
    );

    this.log('Starting analysis');
    this.log(
      'More details about the threshold format can be found at: https://github.com/Jahia/core-perf-test',
    );

    const analysisReport: JMeterExecAnalysisReport[] = [];
    for (const run of jMeterRuns.runs) {
      const threshold = getRunThreshold(run.name, jMeterThresholds);
      if (threshold === undefined) {
        if (flags.verbose) {
          this.log(
            `Skipping analysis for run: ${run.name} - No threshold found`,
          );
        }
      } else {
        this.log(
          `Analyzing run: ${run.name}, using threshold: ${threshold.name}`,
        );
        for (let runStat of Object.values(run.statistics)) {
          // Added a check to handle new format for the statistics object used on core-perf-tests
          if (runStat.transaction === undefined) {
            runStat = Object.values(runStat)[0];
          }

          const statThreshold = getTransactionThreshold(
            runStat.transaction,
            threshold.transactions,
          );
          if (statThreshold === undefined) {
            if (flags.verbose) {
              this.log(
                `Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No threshold found`,
              );
            }
          } else {
            for (const comp of jMeterThresholds.specs) {
              if (
                runStat[comp.metric as keyof JMeterRunTransaction] === undefined
              ) {
                if (flags.verbose) {
                  this.log(
                    `Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No value for: ${comp.metric} in the transaction`,
                  );
                }
              } else if (
                statThreshold[comp.metric as keyof JMeterTRunTransaction] ===
                undefined
              ) {
                if (flags.verbose) {
                  this.log(
                    `Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No threshold found for: ${comp.metric} in the transaction`,
                  );
                }
              } else {
                const runValue =
                  runStat[comp.metric as keyof JMeterRunTransaction];
                const thresholdValue =
                  statThreshold[comp.metric as keyof JMeterTRunTransaction];
                let thresholdError = false;
                if (thresholdValue !== undefined && comp.comparator === 'gt') {
                  if (runValue > thresholdValue) {
                    thresholdError = true;
                  }
                } else if (
                  thresholdValue !== undefined &&
                  comp.comparator === 'gte'
                ) {
                  if (runValue >= thresholdValue) {
                    thresholdError = true;
                  }
                } else if (
                  thresholdValue !== undefined &&
                  comp.comparator === 'lt'
                ) {
                  if (runValue < thresholdValue) {
                    thresholdError = true;
                  }
                } else if (
                  thresholdValue !== undefined &&
                  comp.comparator === 'lte' &&
                  runValue <= thresholdValue
                ) {
                  thresholdError = true;
                }

                if (thresholdError) {
                  if (flags.verbose) {
                    this.log(
                      `ERROR: run: ${run.name}, transaction: ${runStat.transaction}, metric: ${comp.metric} is failing threshold => Value: ${runValue} (Operator: ${comp.comparator}) Threshold: ${thresholdValue}`,
                    );
                  }

                  analysisReport.push({
                    comparator: comp.comparator,
                    error: true,
                    metric: comp.metric,
                    run: run.name,
                    runValue,
                    thresholdValue,
                    transaction: runStat.transaction,
                  });
                } else {
                  if (flags.verbose) {
                    this.log(
                      `OK: run: ${run.name}, transaction: ${runStat.transaction}, metric: ${comp.metric} is passing threshold => Value: ${runValue} (Operator: ${comp.comparator}) Threshold: ${thresholdValue}`,
                    );
                  }

                  analysisReport.push({
                    comparator: comp.comparator,
                    error: false,
                    metric: comp.metric,
                    run: run.name,
                    runValue,
                    thresholdValue,
                    transaction: runStat.transaction,
                  });
                }
              }
            }
          }
        }
      }
    }

    if (flags.reportFile !== '') {
      this.log(`Saving report to: ${flags.reportFile}`);
      fs.writeFileSync(
        path.join(flags.reportFile),
        JSON.stringify({
          analysis: analysisReport,
          startedAt: jMeterRuns.startedAt,
          tags: jMeterRuns.tags,
        }),
      );
    }

    if (analysisReport.some((a) => a.error === true)) {
      this.log('The following values were failing threshold:');
      for (const error of analysisReport.filter((a) => a.error === true)) {
        this.log(
          `ERROR: run: ${error.run}, transaction: ${
            error.transaction
          }, metric: ${
            error.metric
          } is failing threshold => Value: ${Math.round(
            Number(error.runValue),
          )} (Operator: ${error.comparator}) Threshold: ${
            error.thresholdValue
          }`,
        );
      }

      if (flags.failOnError) {
        this.log('Exiting with exit code: 1 (failed)');
        this.exit(1);
      }
    }
  }
}

export default JahiaAnalyzePerfsReporter;
