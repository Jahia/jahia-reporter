import { JRReport, JRRun, JRTestsuite } from '../../global.type.js';

// Helper function to format failed tests
const formatFailedTests = (suite: JRTestsuite): string => {
  let result = '';
  for (const test of suite.tests.filter((t) => t.status === 'FAIL')) {
    result += `\n |   |    | - FAIL: ${test.name}`;
  }

  return result;
};

// Helper function to format failed suites
const formatFailedSuites = (report: JRReport): string => {
  let result = '';
  for (const suite of report.testsuites.filter((s) => s.failures > 0)) {
    result += `\n |   | - ${suite.name}`;
    result += formatFailedTests(suite);
  }

  return result;
};

// Helper function to format skipped tests
const formatSkippedTests = (suite: JRTestsuite): string => {
  let result = '';
  for (const test of suite.tests.filter((t) => t.status === 'FAIL')) {
    result += `\n |   |    | - SKIPPED: ${test.name}`;
  }

  return result;
};

// Helper function to format skipped suites
const formatSkippedSuites = (report: JRReport): string => {
  let result = '';
  for (const suite of report.testsuites.filter((s) => s.skipped > 0)) {
    result += `\n |   | - ${suite.name}`;
    result += formatSkippedTests(suite);
  }

  return result;
};

// Helper function to format pending tests
const formatPendingTests = (suite: JRTestsuite): string => {
  let result = '';
  for (const test of suite.tests.filter((t) => t.status === 'FAIL')) {
    result += `\n |   |    | - PENDING: ${test.name}`;
  }

  return result;
};

// Helper function to format pending suites
const formatPendingSuites = (report: JRReport): string => {
  let result = '';
  for (const suite of report.testsuites.filter((s) => s.pending > 0)) {
    result += `\n |   | - ${suite.name}`;
    result += formatPendingTests(suite);
  }

  return result;
};

// Taking a test report, this returns a summary of the results
export const getSummary = ({
  report,
  sourceType = 'xml',
}: {
  report: JRRun;
  sourceType: string;
}): string => {
  const testTotal = report.tests;
  let testFailures = report.failures;
  const testSkipped = report.skipped;
  const testPending = report.pending;

  if (
    sourceType === 'xml' &&
    testSkipped > 0 &&
    testFailures < 0 &&
    testFailures + testSkipped === 0
  ) {
    testFailures = 0;
  }

  let summary = `Total Tests: ${testTotal} - Failure: ${testFailures} (skipped: ${testSkipped}, pending: ${testPending}) - Executed in ${report.time}s`;

  if (report.failures > 0) {
    summary += '\nFAILURES:';
    for (const r of report.reports.filter((r) => r.failures > 0)) {
      summary += `\n | Suite: ${r.name} - Total tests: ${r.tests} - Failure: ${r.failures} - Executed in ${r.time}s`;
      summary += formatFailedSuites(r);
    }
  }

  // Skipped and Pending are only supported for JSON reports
  if (sourceType === 'json') {
    if (report.skipped > 0) {
      summary += '\nSKIPPED:';
      for (const r of report.reports.filter((r) => r.skipped > 0)) {
        summary += `\n | Suite: ${r.name} - Total tests: ${r.tests} - Skipped: ${r.skipped} - Executed in ${r.time}s`;
        summary += formatSkippedSuites(r);
      }
    }

    if (report.pending > 0) {
      summary += '\nPENDING:';
      for (const r of report.reports.filter((r) => r.pending > 0)) {
        summary += `\n | Suite: ${r.name} - Total tests: ${r.tests} - Pending: ${r.pending} - Executed in ${r.time}s`;
        summary += formatPendingSuites(r);
      }
    }
  }

  return summary;
};
