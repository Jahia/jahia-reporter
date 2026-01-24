import { JRRun } from '../../types/index.js';

// Taking a test report, this returns a summary of the results
export const getSummary = ({
  report,
  sourceType = 'xml',
}: {
  report: JRRun;
  sourceType?: string;
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
      for (const s of r.testsuites.filter((s) => s.failures > 0)) {
        summary += `\n |   | - ${s.name}`;
        for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
          summary += `\n |   |    | - FAIL: ${t.name}`;
        }
      }
    }
  }

  // Skipped and Pending are only supported for JSON reports
  if (sourceType === 'json') {
    if (report.skipped > 0) {
      summary += '\nSKIPPED:';
      for (const r of report.reports.filter((r) => r.skipped > 0)) {
        summary += `\n | Suite: ${r.name} - Total tests: ${r.tests} - Skipped: ${r.skipped} - Executed in ${r.time}s`;
        for (const s of r.testsuites.filter((s) => s.skipped > 0)) {
          summary += `\n |   | - ${s.name}`;
          // eslint-disable-next-line max-depth
          for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
            summary += `\n |   |    | - SKIPPED: ${t.name}`;
          }
        }
      }
    }

    if (report.pending > 0) {
      summary += '\nPENDING:';
      for (const r of report.reports.filter((r) => r.pending > 0)) {
        summary += `\n | Suite: ${r.name} - Total tests: ${r.tests} - Pending: ${r.pending} - Executed in ${r.time}s`;
        for (const s of r.testsuites.filter((s) => s.pending > 0)) {
          summary += `\n |   | - ${s.name}`;
          // eslint-disable-next-line max-depth
          for (const t of s.tests.filter((t) => t.status === 'FAIL')) {
            summary += `\n |   |    | - PENDING: ${t.name}`;
          }
        }
      }
    }
  }

  return summary;
};
