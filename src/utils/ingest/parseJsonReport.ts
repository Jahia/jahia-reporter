import { basename } from 'node:path';

import { JRReport, JRRun } from '../../types/index.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mochaParser = (rawReports: any[]): JRRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const filteredReports = rawReports.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rc: any) =>
      rc.content.stats !== undefined && rc.content.results !== undefined,
  );

  // Process reports without using Array.reduce()
  const reports: JRReport[] = [];
  for (const rawContent of filteredReports) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedReport: any = {
      failures: rawContent.content.stats.failures,
      name: basename(rawContent.filepath),
      pending: rawContent.content.stats.pending,
      skipped: rawContent.content.stats.skipped,
      tests: rawContent.content.stats.tests,
      testsuites: rawContent.content.results.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mochaReport: any) => ({
          failures: mochaReport.suites[0].failures.length,
          name: mochaReport.suites[0].title,
          pending: mochaReport.suites[0].pending.length,
          skipped: mochaReport.suites[0].skipped.length,
          tests: mochaReport.suites[0].tests.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (mochaTest: any) => {
              let status = 'PASS';
              if (mochaTest.fail === true) {
                status = 'FAIL';
              } else if (mochaTest.pending === true) {
                status = 'PENDING';
              }

              return {
                failures: [{ text: mochaTest.err.estack }],
                name: mochaTest.title,
                status,
                steps: mochaTest.code,
                time: mochaTest.duration,
              };
            },
          ),
          time: mochaReport.suites[0].duration,
          timestamp: '',
        }),
      ),
      time: Math.round(rawContent.content.stats.duration / 1000), // Time is in ms, converting to s
      timestamp: rawContent.content.stats.start,
    };

    reports.push(parsedReport);
  }

  // Calculate aggregates without using Array.reduce()
  let totalFailures = 0;
  let totalPending = 0;
  let totalSkipped = 0;
  let totalTests = 0;
  let totalTime = 0;

  for (const report of reports) {
    totalFailures += report.failures;
    totalPending += report.pending;
    totalSkipped += report.skipped;
    totalTests += report.tests;
    totalTime += report.time;
  }

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    failures: totalFailures,
    pending: totalPending,
    reports,
    skipped: totalSkipped,
    tests: totalTests,
    time: totalTime,
  };
};

// Take an array of junit json files, return a javascript representation of the files content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseJson = (rawReports: any[]): JRRun => mochaParser(rawReports);
