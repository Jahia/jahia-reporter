import * as path from 'node:path';

import ingestReport from '../src/utils/ingest/index.js';
import { getSummary } from '../src/utils/reports/getSummary.js';

const log = (msg: string) => {
  console.log(msg);
};

describe('getSummary', () => {
  describe('XML reports', () => {
    it('should generate summary for JUnit XML reports with failures', async () => {
      const jrRun = await ingestReport(
        'xml',
        path.resolve(__dirname, './assets/junit'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'xml' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('Executed in');

      if (jrRun.failures > 0) {
        expect(summary).toContain('FAILURES:');
        expect(summary).toContain('Suite:');
        expect(summary).toContain('FAIL:');
      }

      // XML reports should not contain SKIPPED or PENDING sections
      expect(summary).not.toContain('SKIPPED:');
      expect(summary).not.toContain('PENDING:');
    });

    it('should generate summary for Mocha JUnit XML reports', async () => {
      const jrRun = await ingestReport(
        'xml',
        path.resolve(__dirname, './assets/mocha-junit'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'xml' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('skipped:');
      expect(summary).toContain('pending:');
      expect(summary).toContain('Executed in');

      // XML reports should not contain detailed SKIPPED or PENDING sections
      expect(summary).not.toContain('SKIPPED:');
      expect(summary).not.toContain('PENDING:');
    });
  });

  describe('JSON reports', () => {
    it('should generate summary for JSON report with failures', async () => {
      const jrRun = await ingestReport(
        'json',
        path.resolve(__dirname, './assets/single-json-failure'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'json' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('Executed in');

      if (jrRun.failures > 0) {
        expect(summary).toContain('FAILURES:');
        expect(summary).toContain('Suite:');
        expect(summary).toContain('FAIL:');
      }
    });

    it('should generate summary for JSON report with success', async () => {
      const jrRun = await ingestReport(
        'json',
        path.resolve(__dirname, './assets/single-json-success'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'json' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('Executed in');

      // If no failures, should not contain FAILURES section
      if (jrRun.failures === 0) {
        expect(summary).not.toContain('FAILURES:');
      }
    });

    it('should generate summary for multi JSON reports', async () => {
      const jrRun = await ingestReport(
        'json',
        path.resolve(__dirname, './assets/multi-json'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'json' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('Executed in');

      // JSON reports can include SKIPPED and PENDING sections
      if (jrRun.skipped > 0) {
        expect(summary).toContain('SKIPPED:');
      }

      if (jrRun.pending > 0) {
        expect(summary).toContain('PENDING:');
      }
    });

    it('should include detailed SKIPPED section for JSON reports with skipped tests', async () => {
      // Create a mock report with skipped tests
      const mockReport = {
        failures: 2,
        pending: 1,
        reports: [
          {
            failures: 1,
            name: 'Test Suite 1',
            pending: 0,
            skipped: 2,
            tests: 5,
            testsuites: [
              {
                failures: 0,
                name: 'Test Subsuite 1',
                pending: 0,
                skipped: 2,
                tests: [
                  {
                    failures: [],
                    name: 'should skip this test',
                    status: 'SKIP',
                    time: 0,
                  },
                ],
                time: 3.1,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 8.2,
          },
        ],
        skipped: 3,
        tests: 10,
        time: 15.5,
      };

      const summary = getSummary({ report: mockReport, sourceType: 'json' });

      expect(summary).toContain('Total Tests: 10');
      expect(summary).toContain('Failure: 2');
      expect(summary).toContain('skipped: 3');
      expect(summary).toContain('pending: 1');
      expect(summary).toContain('Executed in 15.5s');
      expect(summary).toContain('SKIPPED:');
      expect(summary).toContain('Suite: Test Suite 1');
    });

    it('should include detailed PENDING section for JSON reports with pending tests', async () => {
      // Create a mock report with pending tests
      const mockReport = {
        failures: 1,
        pending: 2,
        reports: [
          {
            failures: 0,
            name: 'Test Suite 2',
            pending: 2,
            skipped: 1,
            tests: 4,
            testsuites: [
              {
                failures: 0,
                name: 'Test Subsuite 2',
                pending: 2,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should be pending',
                    status: 'PENDING',
                    time: 0,
                  },
                ],
                time: 2.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 6.1,
          },
        ],
        skipped: 2,
        tests: 8,
        time: 12.3,
      };

      const summary = getSummary({ report: mockReport, sourceType: 'json' });

      expect(summary).toContain('Total Tests: 8');
      expect(summary).toContain('Failure: 1');
      expect(summary).toContain('skipped: 2');
      expect(summary).toContain('pending: 2');
      expect(summary).toContain('Executed in 12.3s');
      expect(summary).toContain('PENDING:');
      expect(summary).toContain('Suite: Test Suite 2');
    });
  });

  describe('Edge cases', () => {
    it('should handle report with no failures', () => {
      const mockReport = {
        failures: 0,
        pending: 0,
        reports: [],
        skipped: 0,
        tests: 5,
        time: 10,
      };

      const summary = getSummary({ report: mockReport, sourceType: 'xml' });

      expect(summary).toContain('Total Tests: 5');
      expect(summary).toContain('Failure: 0');
      expect(summary).toContain('skipped: 0');
      expect(summary).toContain('pending: 0');
      expect(summary).toContain('Executed in 10s');
      expect(summary).not.toContain('FAILURES:');
      expect(summary).not.toContain('SKIPPED:');
      expect(summary).not.toContain('PENDING:');
    });

    it('should handle XML report with negative failures and skipped tests', () => {
      // Test the XML-specific logic for negative failures
      // The condition is: failures < 0 AND skipped > 0 AND failures + skipped === 0
      const mockReport = {
        failures: -2, // Changed to -2 so that -2 + 2 = 0
        pending: 0,
        reports: [],
        skipped: 2,
        tests: 5,
        time: 8.5,
      };

      const summary = getSummary({ report: mockReport, sourceType: 'xml' });

      // The function should correct negative failures to 0 when skipped > 0 and failures + skipped === 0
      expect(summary).toContain('Failure: 0'); // Should be corrected from -2 to 0
      expect(summary).toContain('skipped: 2');
    });

    it('should handle empty reports array', () => {
      const mockReport = {
        failures: 0,
        pending: 0,
        reports: [],
        skipped: 0,
        tests: 0,
        time: 0,
      };

      const summary = getSummary({ report: mockReport, sourceType: 'json' });

      expect(summary).toContain('Total Tests: 0');
      expect(summary).toContain('Failure: 0');
      expect(summary).toContain('Executed in 0s');
    });

    it('should default sourceType to xml when not provided', () => {
      const mockReport = {
        failures: 1,
        pending: 1,
        reports: [
          {
            failures: 1,
            name: 'Test Suite',
            pending: 1,
            skipped: 1,
            tests: 3,
            testsuites: [
              {
                failures: 1,
                name: 'Test Subsuite',
                pending: 1,
                skipped: 1,
                tests: [
                  {
                    failures: [{ text: 'Test failed' }],
                    name: 'failing test',
                    status: 'FAIL',
                    time: 1,
                  },
                ],
                time: 5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 5,
          },
        ],
        skipped: 1,
        tests: 3,
        time: 5,
      };

      // Test without sourceType parameter (should default to 'xml')
      const summary = getSummary({ report: mockReport });

      expect(summary).toContain('Total Tests: 3');
      expect(summary).toContain('FAILURES:');
      // Should not contain SKIPPED/PENDING sections since it defaults to XML
      expect(summary).not.toContain('SKIPPED:');
      expect(summary).not.toContain('PENDING:');
    });
  });

  describe('Performance tests', () => {
    it('should generate summary for performance JSON reports', async () => {
      const jrRun = await ingestReport(
        'json-perf',
        path.resolve(__dirname, './assets/perf-json/perf-analysis.json'),
        log,
      );
      const summary = getSummary({ report: jrRun, sourceType: 'json' });

      expect(summary).toContain('Total Tests:');
      expect(summary).toContain('Failure:');
      expect(summary).toContain('Executed in');

      if (jrRun.failures > 0) {
        expect(summary).toContain('FAILURES:');
      }
    });
  });
});
