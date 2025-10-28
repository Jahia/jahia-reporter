import { JMeterExecAnalysisReport, JRReport, JRRun } from '../../global.type';

// Take an array of performance reports and parsing it
export const parseJsonPerf = (
  rawAnalysis: JMeterExecAnalysisReport[],
): JRRun => {
  const allRuns = rawAnalysis.map((a) => a.run);
  const uniqueRuns = [...new Set(allRuns)];

  const reports: JRReport[] = [];
  for (const run of uniqueRuns) {
    const transactions = rawAnalysis
      .filter((a) => a.run === run)
      .map((a) => a.transaction);
    reports.push({
      failures: rawAnalysis.filter((a) => a.run === run && a.error === true)
        .length,
      name: run,
      pending: 0,
      skipped: 0,
      tests: rawAnalysis.filter((a) => a.run === run).length,
      testsuites: transactions.map((t) => {
        const metrics = rawAnalysis
          .filter((a) => a.run === run && a.transaction === t)
          .map((a) => a.metric);
        return {
          failures: rawAnalysis.filter(
            (a) => a.run === run && a.transaction === t && a.error === true,
          ).length,
          name: t,
          pending: 0,
          skipped: 0,
          tests: metrics.map((m) => {
            const metricTest = rawAnalysis.find(
              (a) => a.run === run && a.transaction === t && a.metric === m,
            );
            return {
              failures:
                metricTest !== undefined && metricTest.error === true
                  ? [
                      {
                        text: `ERROR: run: ${metricTest.run}, transaction: ${metricTest.transaction}, metric: ${metricTest.metric} is failing threshold => Value: ${metricTest.runValue} (Operator: ${metricTest.comparator}) Threshold: ${metricTest.thresholdValue}`,
                      },
                    ]
                  : [],
              name: m,
              pending: 0,
              skipped: 0,
              status:
                metricTest !== undefined && metricTest.error === true
                  ? 'FAIL'
                  : 'PASS',
              time: 0,
            };
          }),
          time: 0,
          timestamp: '',
        };
      }),
      time: 0,
    });
  }

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    failures: rawAnalysis.filter((a) => a.error).length,
    pending: 0,
    reports,
    skipped: 0,
    tests: rawAnalysis.length,
    time: 0,
  };
};
