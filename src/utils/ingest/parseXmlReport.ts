import { basename } from 'node:path';

import { JRReport, JRRun } from '../../types/index.js';

// The first failure or error of a test, with its message and its stack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildError = (elements: any[]) => {
  const failure = elements.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => e.name === 'failure' || e.name === 'error',
  );
  if (failure === undefined) {
    return {};
  }

  const stack: string = (failure.elements ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((e: any) => e.cdata ?? e.text ?? '')
    .join('');
  return {
    error: {
      message: failure.attributes?.message || stack.trim().split('\n')[0],
      stack,
    },
  };
};

// Format individual test cases
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildTest = (xmlTests: any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  xmlTests.map((t: any) => {
    let status = t.elements?.some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => e.name === 'failure' || e.name === 'error',
    )
      ? 'FAIL'
      : 'PASS';
    if (
      t.elements !== undefined &&
      t.elements.length > 0 &&
      t.elements[0].name !== undefined &&
      t.elements[0].name === 'skipped'
    ) {
      status = 'SKIP';
    }

    if (
      t.elements !== undefined &&
      t.elements.length > 0 &&
      t.elements[0].name !== undefined &&
      t.elements[0].name === 'pending'
    ) {
      status = 'PENDING';
    }

    return {
      ...t.attributes,
      ...(status === 'FAIL' ? buildError(t.elements) : {}),
      failures:
        t.elements === undefined
          ? []
          : // eslint-disable-next-line @typescript-eslint/no-explicit-any
            t.elements.map((f: any) => JSON.stringify(f.elements)),
      status,
      time: Math.round(t.attributes.time),
    };
  });

// Format individual test suites
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildSuites = (xmlSuites: any, testFilename: string) => {
  // mocha-junit-reporter names the spec file on the root suite alone, which holds no test and comes
  // before the suites of its spec. A merged report holds one root suite for each spec.
  let file: string | undefined;
  return (
    xmlSuites
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => {
        file = s.attributes?.file || file;
        return {
          ...s.attributes,
          ...(file === undefined ? {} : { file }),
          // Some of the existing testsuites have 'null' (as a string) instead of
          // a name, if this is the case, we replace null by the name of the file
          errors: Math.round(s.attributes.errors),
          failures: Math.max(Math.round(s.attributes.failures), 0),
          // which is more informative
          name: s.attributes.name === 'null' ? testFilename : s.attributes.name,
          pending:
            s.attributes.pending === undefined
              ? 0
              : Math.round(s.attributes.pending),
          skipped:
            s.attributes.skipped === undefined
              ? 0
              : Math.round(s.attributes.skipped),
          tests:
            s.elements === undefined
              ? []
              : // eslint-disable-next-line @typescript-eslint/no-explicit-any
                buildTest(s.elements.filter((t: any) => t.name === 'testcase')),
          testsCount: Math.round(s.attributes.tests),
          time: Math.round(s.attributes.time),
        };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((s: any) => s.testsCount > 0)
  );
};

// Take an array of junit xml files, return a javascript representation of the files content
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseXML = (rawReports: any[]): JRRun => {
  // Filter out empty reports
  const filteredReports = rawReports.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rawContent: any) => rawContent.content.elements !== undefined,
  );

  // Process reports without using Array.reduce()
  const reports: JRReport[] = [];
  for (const rawContent of filteredReports) {
    const parsedReports = rawContent.content.elements
      // Don't process suites if there are no tests
      .filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) =>
          i.attributes.tests !== undefined &&
          Number.parseInt(i.attributes.tests, 10) > 0,
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => {
        let testsuites = [];
        testsuites =
          i.name === 'testsuite' || i.name === 'suite'
            ? buildSuites([i], basename(rawContent.filepath))
            : buildSuites(i.elements, basename(rawContent.filepath));
        const report = {
          ...i.attributes,
          failures: Math.max(Math.round(i.attributes.failures), 0),
          name:
            i.attributes.name === 'null'
              ? basename(rawContent.filepath)
              : i.attributes.name,
          pending:
            i.attributes.pending === undefined
              ? 0
              : Math.round(i.attributes.pending),
          skipped:
            i.attributes.skipped === undefined
              ? 0
              : Math.round(i.attributes.skipped),
          tests: Math.round(i.attributes.tests),
          // testsuites: buildSuites(i.elements),
          testsuites,
          time: Math.round(i.attributes.time),
        };
        return report;
      });

    reports.push(...parsedReports);
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
