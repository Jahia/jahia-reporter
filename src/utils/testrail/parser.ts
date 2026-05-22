import type { JRRun, TestWithStatus } from '../../types/index.js';

/**
 * Safely parses and validates test context from JSON string
 * @param {string | undefined} metaJson - JSON string containing context metadata
 * @returns Valid context object or empty one when context is absent/invalid
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMeta(metaJson: string | undefined): Record<string, any> {
  // Undefined, empty string, or whitespace-only JSON
  if (!metaJson || metaJson.trim() === '') {
    return {};
  }

  try {
    const parsed = JSON.parse(metaJson);
    // Ensure it's a valid object (Record<string, any>)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {meta: parsed};
    }

    // Ignore unexpected non-object JSON payloads
    return {};
  } catch {
    // Invalid JSON or improper format
    return {};
  }
}

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

          // Evaluate test.context
          // In older versions it might have different format, thus such cases should be skipped
          // e.g.: "context": "\"videos/api/firstCheck.spec.begin.ts.mp4\"",
          // Expected format to be processed:
          // "context": "{\n  \"video\": \"videos/graphQL.mfa.customFactor.cy.ts.mp4\",\n  \"tags\": [\n    \"email\",\n    \"mfa\",\n    \"regression\",\n    \"smoke\",\n    \"P1\",\n    \"fallback-template\"\n  ]\n}",
          // Parse and validate context: ensure correct format and that context contains a Record<string: any>
          // If valid JSON and proper format, use it; otherwise use an empty object and skip adding it going forward.
          const metaInfo = parseMeta(testcase.meta);

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
              ...metaInfo,
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
              ...metaInfo,
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
            ...metaInfo,
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
