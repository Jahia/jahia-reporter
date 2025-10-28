import { basename } from 'node:path';

import { JRReport, JRRun } from '../../global.type';

const mochaParser = (rawReports: any[]): JRRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const reports: JRReport[] = rawReports
    .filter(
      (rc: any) =>
        rc.content.stats !== undefined && rc.content.results !== undefined,
    )
    .reduce((acc: any, rawContent: any) => {
      const parsedReport: any = [
        {
          failures: rawContent.content.stats.failures,
          name: basename(rawContent.filepath),
          pending: rawContent.content.stats.pending,
          skipped: rawContent.content.stats.skipped,
          tests: rawContent.content.stats.tests,
          testsuites: rawContent.content.results.map((mochaReport: any) => ({
            failures: mochaReport.suites[0].failures.length,
            name: mochaReport.suites[0].title,
            pending: mochaReport.suites[0].pending.length,
            skipped: mochaReport.suites[0].skipped.length,
            tests: mochaReport.suites[0].tests.map((mochaTest: any) => {
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
            }),
            time: mochaReport.suites[0].duration,
            timestamp: '',
          })),
          time: Math.round(rawContent.content.stats.duration / 1000), // Time is in ms, converting to s
          timestamp: rawContent.content.stats.start,
        },
      ];

      return [...acc, ...parsedReport];
    }, []);

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    failures: reports
      .map((r) => r.failures)
      .reduce((acc, count) => acc + count, 0),
    pending: reports
      .map((r) => r.pending)
      .reduce((acc, count) => acc + count, 0),
    reports,
    skipped: reports
      .map((r) => r.skipped)
      .reduce((acc, count) => acc + count, 0),
    tests: reports.map((r) => r.tests).reduce((acc, count) => acc + count, 0),
    time: reports.map((r) => r.time).reduce((acc, count) => acc + count, 0),
  };
};

// Take an array of junit json files, return a javascript representation of the files content
export const parseJson = (rawReports: any[]): JRRun => mochaParser(rawReports);
