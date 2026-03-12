import { basename } from 'node:path';

import { JRReport, JRRun } from '../../types/index.js';

interface MochaJSONTest {
  code: string;
  duration: number;
  err: {
    estack: string;
  };
  fail: boolean;
  pending: boolean;
  title: string;
}

interface MochaJSONSuite {
  failures: string[];
  pending: string[];
  skipped: string[];
  suites: MochaJSONSuite[];
  tests: MochaJSONTest[];
  title: string;
  uuid: string;
}

// Ensure suites are only present in the allSuites array once
const addSuite = (
  suite: MochaJSONSuite,
  parentName: string,
  allSuites: MochaJSONSuite[],
) => {
  if (!allSuites.some((s) => s.uuid === suite.uuid)) {
    const suiteTitle =
      parentName === '' ? suite.title : `${parentName} > ${suite.title}`;
    allSuites.push({ ...suite, title: suiteTitle });
  }

  return allSuites;
};

// This logic is needed to handled nested test suites (a describe() within a describe())
// In such a case, the test suite name will be the concatenation of
// the parent suite and child suite, separated by " > "
// All suites names will be placed at the same level
const processTestSuite = (
  parentName: string,
  currentSuite: MochaJSONSuite,
  allSuites: MochaJSONSuite[],
) => {
  if (currentSuite.suites && currentSuite.suites.length > 0) {
    for (const childSuite of currentSuite.suites) {
      const childSuites = processTestSuite(
        currentSuite.title,
        childSuite,
        allSuites,
      );
      for (const suite of childSuites) {
        allSuites = addSuite(suite, currentSuite.title, allSuites);
      }
    }
  }

  if (currentSuite.tests && currentSuite.tests.length > 0) {
    allSuites = addSuite(currentSuite, parentName, allSuites);
  }

  return allSuites;
};

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
    // Create a flat list of suites with concatenated names to represent the hierarchy, instead of nested suites
    let testSuites: MochaJSONSuite[] = [];
    for (const testSpec of rawContent.content.results) {
      const specSuites = processTestSuite('', testSpec, []);
      testSuites = [...testSuites, ...specSuites];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedReport: any = {
      failures: rawContent.content.stats.failures,
      name: basename(rawContent.filepath),
      pending: rawContent.content.stats.pending,
      skipped: rawContent.content.stats.skipped,
      tests: rawContent.content.stats.tests,
      testsuites: testSuites.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (suite: any) => ({
          failures: suite.failures.length,
          name: suite.title,
          pending: suite.pending.length,
          skipped: suite.skipped.length,
          tests: suite.tests.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (test: any) => {
              let status = 'PASS';
              if (test.fail === true) {
                status = 'FAIL';
              } else if (test.pending === true) {
                status = 'PENDING';
              }

              return {
                failures: [{ text: test.err.estack }],
                name: test.title,
                status,
                steps: test.code,
                time: test.duration,
              };
            },
          ),
          time: suite.duration,
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
