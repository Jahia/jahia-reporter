import type { JRRun } from '../src/types/index.js';

import { parseTestsFromReports } from '../src/utils/testrail/parser.js';

describe('parseTestsFromReports', () => {
  // Helper to create a minimal JRRun
  const createJRRun = (reports: JRRun['reports']): JRRun => ({
    failures: 0,
    pending: 0,
    reports,
    skipped: 0,
    tests: 0,
    time: 0,
  });

  describe('basic parsing', () => {
    it('should return empty array for empty reports', () => {
      const jrRun = createJRRun([]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toEqual([]);
    });

    it('should parse a single passing test', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'should pass',
                  status: 'PASS',
                  time: 100,
                },
              ],
              time: 100,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 100,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        section: 'TestSuite',
        status: 'PASS',
        steps: undefined,
        time: '100',
        title: 'should pass',
      });
    });

    it('should parse a failing test with comment', () => {
      const jrRun = createJRRun([
        {
          failures: 1,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 1,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [
                    { text: 'AssertionError: expected true to be false' },
                  ],
                  name: 'should fail',
                  status: 'FAIL',
                  time: 50,
                },
              ],
              time: 50,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 50,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        comment: 'AssertionError: expected true to be false',
        section: 'TestSuite',
        status: 'FAIL',
        steps: undefined,
        time: '50',
        title: 'should fail',
      });
    });

    it('should parse a skipped test', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 1,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite',
              pending: 0,
              skipped: 1,
              tests: [
                {
                  failures: [],
                  name: 'should be skipped',
                  status: 'SKIP',
                  time: 0,
                },
              ],
              time: 0,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 0,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('SKIP');
    });

    it('should parse a pending test as skipped', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 1,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite',
              pending: 1,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'should be pending',
                  status: 'pending',
                  time: 0,
                },
              ],
              time: 0,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 0,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('SKIP');
    });
  });

  describe('hook filtering', () => {
    it('should filter out hook tests', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 3,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: '"before all" hook',
                  status: 'PASS',
                  time: 10,
                },
                {
                  failures: [],
                  name: 'actual test',
                  status: 'PASS',
                  time: 100,
                },
                {
                  failures: [],
                  name: '"after all" hook',
                  status: 'PASS',
                  time: 5,
                },
              ],
              time: 115,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 115,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('actual test');
    });
  });

  describe('section name handling', () => {
    it('should remove parenthetical content from suite name', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite (Chrome)',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'should work',
                  status: 'PASS',
                  time: 100,
                },
              ],
              time: 100,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 100,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].section).toBe('TestSuite');
    });

    it('should remove section name prefix from test title', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Login',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'Login should authenticate user',
                  status: 'PASS',
                  time: 100,
                },
              ],
              time: 100,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 100,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].title).toBe('should authenticate user');
      expect(result[0].section).toBe('Login');
    });
  });

  describe('multiple failures', () => {
    it('should concatenate multiple failure messages', () => {
      const jrRun = createJRRun([
        {
          failures: 1,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 1,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [{ text: 'First error' }, { text: 'Second error' }],
                  name: 'should fail multiple',
                  status: 'FAIL',
                  time: 50,
                },
              ],
              time: 50,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 50,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].comment).toBe('First error,Second error');
    });

    it('should filter out undefined failures', () => {
      const jrRun = createJRRun([
        {
          failures: 1,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 1,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [
                    { text: 'Valid error' },
                    null as any,
                    { text: '' },
                    { text: 'Another error' },
                  ],
                  name: 'should handle null failures',
                  status: 'FAIL',
                  time: 50,
                },
              ],
              time: 50,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 50,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].comment).toBe('Valid error,Another error');
    });
  });

  describe('multiple reports and suites', () => {
    it('should parse tests from multiple reports', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report1',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite1',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'test1',
                  status: 'PASS',
                  time: 10,
                },
              ],
              time: 10,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 10,
        },
        {
          failures: 0,
          name: 'Report2',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite2',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'test2',
                  status: 'PASS',
                  time: 20,
                },
              ],
              time: 20,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 20,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('test1');
      expect(result[1].title).toBe('test2');
    });

    it('should parse tests from multiple suites in one report', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report',
          pending: 0,
          skipped: 0,
          tests: 2,
          testsuites: [
            {
              failures: 0,
              name: 'SuiteA',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'testA',
                  status: 'PASS',
                  time: 10,
                },
              ],
              time: 10,
              timestamp: '2024-01-01T00:00:00Z',
            },
            {
              failures: 0,
              name: 'SuiteB',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'testB',
                  status: 'PASS',
                  time: 20,
                },
              ],
              time: 20,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 30,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(2);
      expect(result[0].section).toBe('SuiteA');
      expect(result[1].section).toBe('SuiteB');
    });
  });

  describe('logging', () => {
    it('should call logger when provided', () => {
      const logger = jest.fn();
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'TestReport',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'TestSuite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'test',
                  status: 'PASS',
                  time: 10,
                },
              ],
              time: 10,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 10,
        },
      ]);

      parseTestsFromReports(jrRun, logger);

      expect(logger).toHaveBeenCalledWith('- Analyzed report: TestReport');
      expect(logger).toHaveBeenCalledWith('   |- Analyzed suite: TestSuite');
      expect(logger).toHaveBeenCalledWith(
        '   |    |- Analyzed test: test - Status: PASS',
      );
    });

    it('should log FAIL status for failing tests', () => {
      const logger = jest.fn();
      const jrRun = createJRRun([
        {
          failures: 1,
          name: 'Report',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 1,
              name: 'Suite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [{ text: 'error' }],
                  name: 'failing test',
                  status: 'FAIL',
                  time: 10,
                },
              ],
              time: 10,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 10,
        },
      ]);

      parseTestsFromReports(jrRun, logger);

      expect(logger).toHaveBeenCalledWith(
        '   |    |- Analyzed test: failing test - Status: FAIL',
      );
    });

    it('should log SKIP status for skipped tests', () => {
      const logger = jest.fn();
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report',
          pending: 0,
          skipped: 1,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite',
              pending: 0,
              skipped: 1,
              tests: [
                {
                  failures: [],
                  name: 'skipped test',
                  status: 'skipped',
                  time: 0,
                },
              ],
              time: 0,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 0,
        },
      ]);

      parseTestsFromReports(jrRun, logger);

      expect(logger).toHaveBeenCalledWith(
        '   |    |- Analyzed test: skipped test - Status: SKIP',
      );
    });
  });

  describe('steps handling', () => {
    it('should include steps when present', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report',
          pending: 0,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite',
              pending: 0,
              skipped: 0,
              tests: [
                {
                  failures: [],
                  name: 'test with steps',
                  status: 'PASS',
                  steps: 'Step 1: Do this\nStep 2: Do that',
                  time: 10,
                },
              ],
              time: 10,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 10,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].steps).toBe('Step 1: Do this\nStep 2: Do that');
    });
  });

  describe('status variations', () => {
    it('should handle skipped status in failures array', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report',
          pending: 0,
          skipped: 1,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite',
              pending: 0,
              skipped: 1,
              tests: [
                {
                  failures: [{ text: 'Skipped reason' }],
                  name: 'test',
                  status: 'skipped',
                  time: 0,
                },
              ],
              time: 0,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 0,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].status).toBe('SKIP');
    });

    it('should handle pending status in failures array', () => {
      const jrRun = createJRRun([
        {
          failures: 0,
          name: 'Report',
          pending: 1,
          skipped: 0,
          tests: 1,
          testsuites: [
            {
              failures: 0,
              name: 'Suite',
              pending: 1,
              skipped: 0,
              tests: [
                {
                  failures: [{ text: 'Pending reason' }],
                  name: 'test',
                  status: 'pending',
                  time: 0,
                },
              ],
              time: 0,
              timestamp: '2024-01-01T00:00:00Z',
            },
          ],
          time: 0,
        },
      ]);

      const result = parseTestsFromReports(jrRun);

      expect(result[0].status).toBe('SKIP');
    });
  });
});
