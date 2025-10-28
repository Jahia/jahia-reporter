import { v5 as uuidv5 } from 'uuid';

import { Incident, JRRun } from '../../global.type';
import ingestReport from '../../utils/ingest/index.js';
import { getSummary } from '../../utils/reports/getSummary.js';

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
  log,
  service,
  sourcePath,
  sourceType,
}: {
  log: any;
  service: string;
  sourcePath: string;
  sourceType: string;
}): Promise<Incident> => {
  const report: JRRun = await ingestReport(sourceType, sourcePath, log);

  const incidentTitle = `${service} - ${report.failures}/${
    report.tests
  } FAILED test${report.failures === 1 ? '' : 's'} during test execution`;

  // const dedupKey = uuidv5(`${service}`, '92ca6951-5785-4d62-9f33-3512aaa91a9b');
  return {
    counts: {
      fail: report.failures,
      skip: report.skipped,
      success: report.tests - report.failures - report.skipped,
      total: report.tests,
    },
    dedupKey: getDedupKeyFromTests(report, service),
    description: getSummary({ report, sourceType }),
    service,
    sourceUrl: '',
    title: incidentTitle,
  };
};
