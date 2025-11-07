import type { JRRun, JRTestfailure } from '../src/global.type.js';

import { parseTestsFromReports } from '../src/utils/testrail/parser.js';

describe('TestRail Parser', () => {
  describe('parseTestsFromReports', () => {
    const mockLogger = jest.fn();

    beforeEach(() => {
      mockLogger.mockClear();
    });

    it('should parse basic test data correctly', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        section: 'Test Suite',
        status: 'PASS',
        steps: undefined,
        time: '1.5',
        title: 'should pass test',
      });
    });

    it('should filter out hooks from test results', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 3,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test',
                    status: 'PASS',
                    time: 1.5,
                  },
                  {
                    failures: [],
                    name: '"before each" hook for "should pass test"',
                    status: 'PASS',
                    time: 0.1,
                  },
                  {
                    failures: [],
                    name: '"after each" hook for "should pass test"',
                    status: 'PASS',
                    time: 0.1,
                  },
                ],
                time: 1.7,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.7,
          },
        ],
        skipped: 0,
        tests: 3,
        time: 1.7,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('should pass test');
    });

    it('should handle suite names with parentheses', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite (with extra info)',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('Test Suite');
    });

    it('should strip section name from test name when present', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Auth Tests',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'Auth Tests should login successfully',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('should login successfully');
      expect(result[0].section).toBe('Auth Tests');
    });

    it('should handle test failures with comments', () => {
      const failure: JRTestfailure = {
        text: 'Expected true but got false',
      };

      const jrRun: JRRun = {
        failures: 1,
        pending: 0,
        reports: [
          {
            failures: 1,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 1,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [failure],
                    name: 'should fail test',
                    status: 'FAIL',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        comment: 'Expected true but got false',
        section: 'Test Suite',
        status: 'FAIL',
        title: 'should fail test',
      });
    });

    it('should handle multiple failures', () => {
      const failures: JRTestfailure[] = [
        { text: 'First error' },
        { text: 'Second error' },
      ];

      const jrRun: JRRun = {
        failures: 1,
        pending: 0,
        reports: [
          {
            failures: 1,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 1,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures,
                    name: 'should fail test',
                    status: 'FAIL',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].comment).toBe('First error,Second error');
    });

    it('should filter out undefined failures', () => {
      const failures = [
        { text: 'Valid error' },
        undefined,
        { text: 'Another valid error' },
      ] as JRTestfailure[];

      const jrRun: JRRun = {
        failures: 1,
        pending: 0,
        reports: [
          {
            failures: 1,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 1,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures,
                    name: 'should fail test',
                    status: 'FAIL',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].comment).toBe('Valid error,Another valid error');
    });

    it('should handle test with steps', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test with steps',
                    status: 'PASS',
                    steps: 'Step 1: Do something\nStep 2: Verify result',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].steps).toBe(
        'Step 1: Do something\nStep 2: Verify result',
      );
    });

    it('should handle multiple reports and test suites', () => {
      const jrRun: JRRun = {
        failures: 1,
        pending: 0,
        reports: [
          {
            failures: 1,
            name: 'Report 1',
            pending: 0,
            skipped: 0,
            tests: 2,
            testsuites: [
              {
                failures: 0,
                name: 'Suite 1',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'test 1',
                    status: 'PASS',
                    time: 1,
                  },
                ],
                time: 1,
                timestamp: '2023-01-01T00:00:00Z',
              },
              {
                failures: 1,
                name: 'Suite 2',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [{ text: 'Error' }],
                    name: 'test 2',
                    status: 'FAIL',
                    time: 2,
                  },
                ],
                time: 2,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 3,
          },
          {
            failures: 0,
            name: 'Report 2',
            pending: 0,
            skipped: 1,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Suite 3',
                pending: 0,
                skipped: 1,
                tests: [
                  {
                    failures: [],
                    name: 'test 3',
                    status: 'SKIP',
                    time: 0,
                  },
                ],
                time: 0,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 0,
          },
        ],
        skipped: 1,
        tests: 3,
        time: 3,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(3);
      expect(result.map((t) => t.title)).toEqual([
        'test 1',
        'test 2',
        'test 3',
      ]);
      expect(result.map((t) => t.section)).toEqual([
        'Suite 1',
        'Suite 2',
        'Suite 3',
      ]);
      expect(result.map((t) => t.status)).toEqual(['PASS', 'FAIL', 'SKIP']);
    });

    it('should call logger with appropriate messages when provided', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      parseTestsFromReports(jrRun, mockLogger);

      expect(mockLogger).toHaveBeenCalledWith('- Analyzed report: Test Report');
      expect(mockLogger).toHaveBeenCalledWith(
        '   |- Analyzed suite: Test Suite',
      );
      expect(mockLogger).toHaveBeenCalledWith(
        '   |    |- Analyzed test: should pass test - Status: PASS',
      );
    });

    it('should work without logger', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: 'Test Suite',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: 'should pass test',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      expect(() => parseTestsFromReports(jrRun)).not.toThrow();
      const result = parseTestsFromReports(jrRun);
      expect(result).toHaveLength(1);
    });

    it('should handle empty reports', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [],
        skipped: 0,
        tests: 0,
        time: 0,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(0);
    });

    it('should handle suite with no tests', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 0,
            testsuites: [
              {
                failures: 0,
                name: 'Empty Suite',
                pending: 0,
                skipped: 0,
                tests: [],
                time: 0,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 0,
          },
        ],
        skipped: 0,
        tests: 0,
        time: 0,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from section and title names', () => {
      const jrRun: JRRun = {
        failures: 0,
        pending: 0,
        reports: [
          {
            failures: 0,
            name: 'Test Report',
            pending: 0,
            skipped: 0,
            tests: 1,
            testsuites: [
              {
                failures: 0,
                name: '  Test Suite  ',
                pending: 0,
                skipped: 0,
                tests: [
                  {
                    failures: [],
                    name: '  should pass test  ',
                    status: 'PASS',
                    time: 1.5,
                  },
                ],
                time: 1.5,
                timestamp: '2023-01-01T00:00:00Z',
              },
            ],
            time: 1.5,
          },
        ],
        skipped: 0,
        tests: 1,
        time: 1.5,
      };

      const result = parseTestsFromReports(jrRun);

      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('Test Suite');
      expect(result[0].title).toBe('should pass test');
    });
  });
});
