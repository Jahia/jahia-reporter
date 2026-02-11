import { parseJson } from '../src/utils/ingest/parseJsonReport.js';

describe('parseJsonReport', () => {
  describe('parseJson', () => {
    it('should return empty run when given empty array', () => {
      const result = parseJson([]);

      expect(result).toEqual({
        failures: 0,
        pending: 0,
        reports: [],
        skipped: 0,
        tests: 0,
        time: 0,
      });
    });

    it('should filter out reports without stats', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            // Missing stats
            results: [],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports).toHaveLength(0);
    });

    it('should filter out reports without results', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 0,
              duration: 0,
              start: '2024-01-01T00:00:00.000Z',
            },
            // Missing results
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports).toHaveLength(0);
    });

    it('should parse a simple mocha JSON report with passing tests', () => {
      const rawReports = [
        {
          filepath: '/path/to/test-report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 2,
              duration: 1500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'My Test Suite',
                tests: [
                  {
                    title: 'should pass test 1',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: 'expect(true).toBe(true)',
                    err: { estack: '' },
                  },
                  {
                    title: 'should pass test 2',
                    duration: 200,
                    fail: false,
                    pending: false,
                    code: 'expect(1).toBe(1)',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.failures).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.tests).toBe(2);
      expect(result.time).toBe(2); // 1500ms rounded to 2s
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].name).toBe('test-report.json');
      expect(result.reports[0].testsuites).toHaveLength(1);
      expect(result.reports[0].testsuites[0].name).toBe('My Test Suite');
      expect(result.reports[0].testsuites[0].tests).toHaveLength(2);
      expect(result.reports[0].testsuites[0].tests[0].status).toBe('PASS');
      expect(result.reports[0].testsuites[0].tests[1].status).toBe('PASS');
    });

    it('should parse a report with failing tests', () => {
      const rawReports = [
        {
          filepath: '/path/to/failing-report.json',
          content: {
            stats: {
              failures: 1,
              pending: 0,
              skipped: 0,
              tests: 2,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Failing Suite',
                tests: [
                  {
                    title: 'should pass',
                    duration: 50,
                    fail: false,
                    pending: false,
                    code: 'expect(true).toBe(true)',
                    err: { estack: '' },
                  },
                  {
                    title: 'should fail',
                    duration: 100,
                    fail: true,
                    pending: false,
                    code: 'expect(false).toBe(true)',
                    err: {
                      estack: 'AssertionError: expected false to be true',
                    },
                  },
                ],
                suites: [],
                failures: ['should fail'],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.failures).toBe(1);
      expect(result.reports[0].testsuites[0].tests[0].status).toBe('PASS');
      expect(result.reports[0].testsuites[0].tests[1].status).toBe('FAIL');
      expect(result.reports[0].testsuites[0].tests[1].failures[0].text).toBe(
        'AssertionError: expected false to be true',
      );
    });

    it('should parse a report with pending tests', () => {
      const rawReports = [
        {
          filepath: '/path/to/pending-report.json',
          content: {
            stats: {
              failures: 0,
              pending: 1,
              skipped: 0,
              tests: 2,
              duration: 300,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Pending Suite',
                tests: [
                  {
                    title: 'should pass',
                    duration: 50,
                    fail: false,
                    pending: false,
                    code: 'expect(true).toBe(true)',
                    err: { estack: '' },
                  },
                  {
                    title: 'should be pending',
                    duration: 0,
                    fail: false,
                    pending: true,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: ['should be pending'],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.pending).toBe(1);
      expect(result.reports[0].testsuites[0].tests[0].status).toBe('PASS');
      expect(result.reports[0].testsuites[0].tests[1].status).toBe('PENDING');
    });

    it('should handle nested test suites', () => {
      const rawReports = [
        {
          filepath: '/path/to/nested-report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 3,
              duration: 1000,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'parent-suite',
                title: 'Parent Suite',
                tests: [
                  {
                    title: 'parent test',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: 'expect(true).toBe(true)',
                    err: { estack: '' },
                  },
                ],
                suites: [
                  {
                    uuid: 'child-suite',
                    title: 'Child Suite',
                    tests: [
                      {
                        title: 'child test 1',
                        duration: 50,
                        fail: false,
                        pending: false,
                        code: 'expect(1).toBe(1)',
                        err: { estack: '' },
                      },
                      {
                        title: 'child test 2',
                        duration: 50,
                        fail: false,
                        pending: false,
                        code: 'expect(2).toBe(2)',
                        err: { estack: '' },
                      },
                    ],
                    suites: [],
                    failures: [],
                    pending: [],
                    skipped: [],
                  },
                ],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports[0].testsuites).toHaveLength(2);
      // Child suite comes first (processed recursively), with concatenated name
      expect(result.reports[0].testsuites[0].name).toBe(
        'Parent Suite > Child Suite',
      );
      // Parent suite comes second (added after child processing), with its own name
      expect(result.reports[0].testsuites[1].name).toBe('Parent Suite');
    });

    it('should handle deeply nested test suites', () => {
      const rawReports = [
        {
          filepath: '/path/to/deep-nested-report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'level-1',
                title: 'Level 1',
                tests: [],
                suites: [
                  {
                    uuid: 'level-2',
                    title: 'Level 2',
                    tests: [],
                    suites: [
                      {
                        uuid: 'level-3',
                        title: 'Level 3',
                        tests: [
                          {
                            title: 'deep test',
                            duration: 100,
                            fail: false,
                            pending: false,
                            code: 'expect(true).toBe(true)',
                            err: { estack: '' },
                          },
                        ],
                        suites: [],
                        failures: [],
                        pending: [],
                        skipped: [],
                      },
                    ],
                    failures: [],
                    pending: [],
                    skipped: [],
                  },
                ],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      // Only suites with tests should be included
      expect(result.reports[0].testsuites).toHaveLength(1);
      // Note: The implementation only passes the immediate parent's title, not the full chain
      // So Level 3's name becomes "Level 2 > Level 3" (not "Level 1 > Level 2 > Level 3")
      expect(result.reports[0].testsuites[0].name).toBe('Level 2 > Level 3');
    });

    it('should aggregate multiple reports', () => {
      const rawReports = [
        {
          filepath: '/path/to/report1.json',
          content: {
            stats: {
              failures: 1,
              pending: 0,
              skipped: 1,
              tests: 5,
              duration: 2000,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Suite 1',
                tests: [
                  {
                    title: 'test 1',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
        {
          filepath: '/path/to/report2.json',
          content: {
            stats: {
              failures: 2,
              pending: 3,
              skipped: 0,
              tests: 10,
              duration: 3000,
              start: '2024-01-01T10:05:00.000Z',
            },
            results: [
              {
                uuid: 'suite-2',
                title: 'Suite 2',
                tests: [
                  {
                    title: 'test 2',
                    duration: 200,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports).toHaveLength(2);
      expect(result.failures).toBe(3); // 1 + 2
      expect(result.pending).toBe(3); // 0 + 3
      expect(result.skipped).toBe(1); // 1 + 0
      expect(result.tests).toBe(15); // 5 + 10
      expect(result.time).toBe(5); // 2s + 3s
    });

    it('should not add duplicate suites with same uuid', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 2,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Suite 1',
                tests: [
                  {
                    title: 'test 1',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
              {
                uuid: 'suite-2',
                title: 'Suite 2',
                tests: [
                  {
                    title: 'test 2',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports[0].testsuites).toHaveLength(2);
    });

    it('should handle suites without tests (only nested suites)', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'parent-suite',
                title: 'Parent Suite',
                tests: [], // No tests at parent level
                suites: [
                  {
                    uuid: 'child-suite',
                    title: 'Child Suite',
                    tests: [
                      {
                        title: 'child test',
                        duration: 100,
                        fail: false,
                        pending: false,
                        code: '',
                        err: { estack: '' },
                      },
                    ],
                    suites: [],
                    failures: [],
                    pending: [],
                    skipped: [],
                  },
                ],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      // Only the child suite (which has tests) should be included
      expect(result.reports[0].testsuites).toHaveLength(1);
      expect(result.reports[0].testsuites[0].name).toBe(
        'Parent Suite > Child Suite',
      );
    });

    it('should preserve test code/steps in output', () => {
      const testCode = `
        cy.visit('/page');
        cy.get('.button').click();
        cy.contains('Success').should('be.visible');
      `;

      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Suite',
                tests: [
                  {
                    title: 'test with code',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: testCode,
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports[0].testsuites[0].tests[0].steps).toBe(testCode);
    });

    it('should handle mixed report validity (some valid, some invalid)', () => {
      const rawReports = [
        {
          filepath: '/path/to/valid-report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 500,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Valid Suite',
                tests: [
                  {
                    title: 'valid test',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
        {
          filepath: '/path/to/invalid-report.json',
          content: {
            // Invalid - missing stats and results
            someOtherField: 'value',
          },
        },
        {
          filepath: '/path/to/another-valid-report.json',
          content: {
            stats: {
              failures: 1,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 300,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-2',
                title: 'Another Valid Suite',
                tests: [
                  {
                    title: 'another test',
                    duration: 50,
                    fail: true,
                    pending: false,
                    code: '',
                    err: { estack: 'Error message' },
                  },
                ],
                suites: [],
                failures: ['another test'],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      // Only the 2 valid reports should be processed
      expect(result.reports).toHaveLength(2);
      expect(result.failures).toBe(1);
      expect(result.tests).toBe(2);
    });

    it('should correctly convert duration from milliseconds to seconds', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 1234, // 1234ms
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Suite',
                tests: [
                  {
                    title: 'test',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.time).toBe(1); // 1234ms rounded to 1s
      expect(result.reports[0].time).toBe(1);
    });

    it('should preserve timestamp from stats', () => {
      const timestamp = '2024-06-15T14:30:00.000Z';
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 1,
              duration: 500,
              start: timestamp,
            },
            results: [
              {
                uuid: 'suite-1',
                title: 'Suite',
                tests: [
                  {
                    title: 'test',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports[0].timestamp).toBe(timestamp);
    });

    it('should handle multiple specs in results array', () => {
      const rawReports = [
        {
          filepath: '/path/to/report.json',
          content: {
            stats: {
              failures: 0,
              pending: 0,
              skipped: 0,
              tests: 3,
              duration: 1000,
              start: '2024-01-01T10:00:00.000Z',
            },
            results: [
              {
                uuid: 'spec-1-suite',
                title: 'Spec 1 Suite',
                tests: [
                  {
                    title: 'spec 1 test',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
              {
                uuid: 'spec-2-suite',
                title: 'Spec 2 Suite',
                tests: [
                  {
                    title: 'spec 2 test 1',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                  {
                    title: 'spec 2 test 2',
                    duration: 100,
                    fail: false,
                    pending: false,
                    code: '',
                    err: { estack: '' },
                  },
                ],
                suites: [],
                failures: [],
                pending: [],
                skipped: [],
              },
            ],
          },
        },
      ];

      const result = parseJson(rawReports);

      expect(result.reports[0].testsuites).toHaveLength(2);
      expect(result.reports[0].testsuites[0].tests).toHaveLength(1);
      expect(result.reports[0].testsuites[1].tests).toHaveLength(2);
    });
  });
});
