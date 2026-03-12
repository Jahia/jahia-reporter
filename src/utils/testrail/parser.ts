import type { JRRun, TestWithStatus } from '../../types/index.js';

/**
 * Parses test reports from a JRRun and converts them into TestRail-compatible format
 * @param jrRun - The ingested test run data
 * @param logger - Optional logging function
 * @returns Array of tests with status information
 */
export function parseTestsFromReports(
  jrRun: JRRun,
  logger?: (message: string) => void,
): TestWithStatus[] {
  const tests: TestWithStatus[] = [];
  const { reports } = jrRun;

  for (const report of reports) {
    if (logger) {
      logger(`- Analyzed report: ${report.name}`);
    }

    for (const testsuite of report.testsuites) {
      if (logger) {
        logger(`   |- Analyzed suite: ${testsuite.name}`);
      }

      const processedTests = testsuite.tests
        .filter((testcase) => !testcase.name.includes('hook'))
        .map((testcase) => {
          const section = testsuite.name.replace(/ \(.*\)$/, '').trim();
          // Remove section name from test name if present (anywhere in the string)
          let title = testcase.name.replace(/ \(.*\)$/, '').trim();

          // Remove section substring from title wherever it appears
          if (title.includes(section)) {
            title = title.replace(section, '').trim();
          }

          // Ensure title doesn't exceed 240 characters (keep last 240 if too long)
          if (title.length > 240) {
            title = title.slice(-240);
          }

          if (title === '') {
            title = 'Unable to detect test suite name';
          }

          if (testcase.failures.length > 0) {
            const comment = testcase.failures
              .filter((failure) => failure && failure.text) // Filter out undefined failures
              .map((failure) => failure.text)
              .join(','); // Use comma instead of newline for consistency with tests

            const status =
              testcase.status === 'skipped' || testcase.status === 'pending'
                ? 'SKIP'
                : testcase.status;

            if (logger) {
              logger(
                `   |    |- Analyzed test: ${testcase.name} - Status: ${status}`,
              );
            }

            return {
              comment,
              section,
              status,
              steps: testcase.steps,
              time: testcase.time.toString(),
              title,
            };
          }

          // Check if test is skipped even without failures
          if (
            testcase.status === 'SKIP' ||
            testcase.status === 'skipped' ||
            testcase.status === 'pending'
          ) {
            if (logger) {
              logger(`   |    |- Analyzed test: ${title} - Status: SKIP`);
            }

            return {
              section,
              status: 'SKIP' as const,
              steps: testcase.steps,
              time: testcase.time.toString(),
              title,
            };
          }

          if (logger) {
            logger(`   |    |- Analyzed test: ${title} - Status: PASS`);
          }

          return {
            section,
            status: 'PASS' as const,
            steps: testcase.steps,
            time: testcase.time.toString(),
            title,
          };
        });

      tests.push(...processedTests);
    }
  }

  return tests;
}
