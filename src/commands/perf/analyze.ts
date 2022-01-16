/* eslint-disable complexity */
/* eslint-disable max-depth */
import {Command, flags} from '@oclif/command'
import {readFileSync} from 'fs'
import * as fs from 'fs'

import {JMeterExec, JMeterThresholds, JMeterTRunTransaction, JMeterRunTransaction, JMeterExecErrorReport} from '../../global.type'

const getRunThreshold = (runName: string, thresholds: JMeterThresholds) => {
  // First use exact match
  let runThreshold = thresholds.runs.find(t => t.name === runName)
  if (runThreshold !== undefined) {
    return runThreshold
  }

  // Second, try partial match, returning the first matching record
  runThreshold = thresholds.runs.find(t => runName.includes(t.name))
  if (runThreshold !== undefined) {
    return runThreshold
  }

  // Lastly, try returning "*" match or undefined if none found
  runThreshold = thresholds.runs.find(t => t.name === '*')
  return runThreshold
}

const getTransactionThreshold = (runRransactionName: string, thresholdtransactions: JMeterTRunTransaction[]) => {
  let transactionThreshold = thresholdtransactions.find(t => t.name === runRransactionName)
  if (transactionThreshold !== undefined) {
    return transactionThreshold
  }

  transactionThreshold = thresholdtransactions.find(t => runRransactionName.includes(t.name))
  if (transactionThreshold !== undefined) {
    return transactionThreshold
  }

  transactionThreshold = thresholdtransactions.find(t => t.name === '*')
  return transactionThreshold
}

class JahiaAnalyzePerfsReporter extends Command {
  static description = 'Analyze a runs file against values included in a threshold file.]'

  static flags = {
    help: flags.help({char: 'h'}),
    runsFile: flags.string({
      description: 'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    thresholdsFile: flags.string({
      description: 'A json file containing values thresholds',
      required: true,
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaAnalyzePerfsReporter)

    if (!fs.existsSync(flags.runsFile)) {
      this.log(`Unable to read runsFile at: ${flags.runsFile}`)
      this.exit(1)
    }

    const rawFileJmeter = readFileSync(flags.runsFile, 'utf8')
    const jMeterRuns: JMeterExec = JSON.parse(rawFileJmeter.toString())

    if (!fs.existsSync(flags.thresholdsFile)) {
      this.log(`Unable to read thresholdsFile at: ${flags.thresholdsFile}`)
      this.exit(1)
    }

    const rawFileThresholds = readFileSync(flags.thresholdsFile, 'utf8')
    const jMeterThresholds: JMeterThresholds = JSON.parse(rawFileThresholds.toString())

    this.log('Starting analysis')
    this.log('More details about the threshold format can be found at: https://github.com/Jahia/core-perf-test')

    const errorsReport: JMeterExecErrorReport[] = []
    for (const run of jMeterRuns.runs) {
      const threshold = getRunThreshold(run.name, jMeterThresholds)
      if (threshold === undefined) {
        this.log(`Skipping analysis for run: ${run.name} - No threshold found`)
      } else {
        this.log(`Analyzing run: ${run.name}, using threshold: ${threshold.name}`)
        for (const runStat of Object.values(run.statistics)) {
          const statThreshold = getTransactionThreshold(runStat.transaction, threshold.transactions)
          if (statThreshold === undefined) {
            this.log(`Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No threshold found`)
          } else {
            for (const comp of jMeterThresholds.specs) {
              if (runStat[comp.metric as keyof JMeterRunTransaction] === undefined) {
                this.log(`Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No value for: ${comp.metric} in the transaction`)
              } else if (statThreshold[comp.metric as keyof JMeterTRunTransaction] === undefined) {
                this.log(`Skipping analysis for run: ${run.name}, transaction: ${runStat.transaction} - No threshold found for: ${comp.metric} in the transaction`)
              } else {
                const runValue = runStat[comp.metric as keyof JMeterRunTransaction]
                const thresholdValue = statThreshold[comp.metric as keyof JMeterTRunTransaction]
                let thresholdError = false
                if (thresholdValue !== undefined && comp.comparator === 'gt') {
                  if (runValue > thresholdValue) {
                    thresholdError = true
                  }
                } else if (thresholdValue !== undefined && comp.comparator === 'gte') {
                  if (runValue >= thresholdValue) {
                    thresholdError = true
                  }
                } else if (thresholdValue !== undefined && comp.comparator === 'lt') {
                  if (runValue < thresholdValue) {
                    thresholdError = true
                  }
                } else if (thresholdValue !== undefined && comp.comparator === 'lte') {
                  if (runValue <= thresholdValue) {
                    thresholdError = true
                  }
                }
                if (thresholdError) {
                  this.log(`ERROR: run: ${run.name}, transaction: ${runStat.transaction}, metric: ${comp.metric} is failing threshold => Value: ${runValue} (Operator: ${comp.comparator}) Threshold: ${thresholdValue}`)
                  errorsReport.push({run: run.name, transaction: runStat.transaction, metric: comp.metric, comparator: comp.comparator, runValue: runValue, thresholdValue: thresholdValue})
                } else {
                  this.log(`OK: run: ${run.name}, transaction: ${runStat.transaction}, metric: ${comp.metric} is passing threshold => Value: ${runValue} (Operator: ${comp.comparator}) Threshold: ${thresholdValue}`)
                }
              }
            }
          }
        }
      }
    }
    this.log('The following values were failing threshold:')
    for (const error of errorsReport) {
      this.log(`ERROR: run: ${error.run}, transaction: ${error.transaction}, metric: ${error.metric} is failing threshold => Value: ${error.runValue} (Operator: ${error.comparator}) Threshold: ${error.thresholdValue}`)
    }

    if (errorsReport.length > 0) {
      this.exit(1)
    }
  }
}

export = JahiaAnalyzePerfsReporter
