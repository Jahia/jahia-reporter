import {JRRun, JRReport, JMeterExecAnalysisReport} from '../../global.type'

// Take an array of performance reports and parsing it
export const parseJsonPerf = (rawAnalysis: JMeterExecAnalysisReport[]): JRRun => {
  const allRuns = rawAnalysis.map(a => a.run)
  const uniqueRuns = [...new Set(allRuns)]

  const reports: JRReport[] = []
  for (const run of uniqueRuns) {
    const transactions = rawAnalysis.filter(a => a.run === run).map(a => a.transaction)
    reports.push({
      name: run,
      tests: rawAnalysis.filter(a => a.run === run).length,
      failures: rawAnalysis.filter(a => a.run === run && a.error === true).length,
      time: 0,
      testsuites: transactions.map(t => {
        const metrics = rawAnalysis.filter(a => a.run === run && a.transaction === t).map(a => a.metric)
        return {
          name: t,
          failures: rawAnalysis.filter(a => a.run === run && a.transaction === t && a.error === true).length,
          timestamp: '',
          time: 0,
          tests: metrics.map(m => {
            const metricTest = rawAnalysis.find(a => a.run === run && a.transaction === t && a.metric === m)
            return {
              name: m,
              time: 0,
              status: metricTest !== undefined && metricTest.error === true ? 'FAIL' : 'PASS',
              failures: metricTest !== undefined && metricTest.error === true ? [{text: `ERROR: run: ${metricTest.run}, transaction: ${metricTest.transaction}, metric: ${metricTest.metric} is failing threshold => Value: ${metricTest.runValue} (Operator: ${metricTest.comparator}) Threshold: ${metricTest.thresholdValue}`}] : [],
            }
          }),
        }
      }),
    })
  }

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    tests: rawAnalysis.length,
    failures: rawAnalysis.filter(a => a.error).length,
    time: 0,
    reports: reports,
  }
}
