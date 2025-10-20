import { v5 as uuidv5 } from 'uuid';

import ingestReport from '../../utils/ingest/index.js';
import { getSummary } from '../../utils/reports/getSummary.js';

import { JRRun, Incident } from '../../global.type';

// Generate a deduplication key based on the failed tests in the report
const getDedupKeyFromTests = (
  report: JRRun,
  service: string,
  failedOnly: boolean = true,
): string => {
  const tests: string[] = [];
  for (const currentReport of report.reports) {
    for (const testsuite of currentReport.testsuites) {
      for (const test of testsuite.tests) {
        if (failedOnly && test.status !== 'FAIL') continue;
        tests.push(
          `${currentReport.name}-${testsuite.name}-${test.name}-${test.status}`,
        );
      }
    }
  }
  const sortedTests = tests.sort();

  return uuidv5(
    `${service}-${JSON.stringify(sortedTests)}`,
    '92ca6951-5785-4d62-9f33-3512aaa91a9b',
  );
};

export const processIncidentFromTestReport = async ({
  sourceType,
  sourcePath,
  service,
  log,
}: {
  sourceType: string;
  sourcePath: string;
  service: string;
  log: any;
}): Promise<Incident> => {
  const report: JRRun = await ingestReport(sourceType, sourcePath, log);

  const incidentTitle = `${service} - FAIL ${report.failures}/${
    report.tests
  } test${report.failures === 1 ? '' : 's'} during test execution`;

  // const dedupKey = uuidv5(`${service}`, '92ca6951-5785-4d62-9f33-3512aaa91a9b');
  return {
    dedupKey: getDedupKeyFromTests(report, service),
    title: incidentTitle,
    description: getSummary({ report, sourceType, log }),
    success: false,
    counts: {
      total: report.tests,
      fail: report.failures,
      success: report.tests - report.failures - report.skipped,
      skip: report.skipped,
    },
  };
};
