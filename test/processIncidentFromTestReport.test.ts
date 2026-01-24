// Mock uuid before importing any modules that use it
jest.mock('uuid', () => ({
  v5: jest
    .fn()
    .mockImplementation(
      (content: string) => `mocked-uuid-${content.substring(0, 10)}`,
    ),
}));

// Mock dependencies - must be before imports
const mockIngestReportFn = jest.fn();
jest.mock('../src/utils/ingest/index.js', () => ({
  __esModule: true,
  default: mockIngestReportFn,
}));

const mockGetSummaryFn = jest.fn();
jest.mock('../src/utils/reports/getSummary.js', () => ({
  getSummary: mockGetSummaryFn,
}));

import { processIncidentFromTestReport } from '../src/utils/incidents/processIncidentFromTestReport.js';
import type { JRRun } from '../src/types/index.js';

describe('processIncidentFromTestReport', () => {
  const mockLog = jest.fn();

  const createMockReport = (overrides: Partial<JRRun> = {}): JRRun => ({
    failures: 2,
    pending: 0,
    skipped: 1,
    tests: 10,
    time: 100,
    reports: [
      {
        name: 'Test Report',
        failures: 2,
        pending: 0,
        skipped: 1,
        tests: 10,
        time: 100,
        testsuites: [
          {
            name: 'Suite 1',
            failures: 2,
            pending: 0,
            skipped: 1,
            time: 45,
            timestamp: '2024-01-01T00:00:00Z',
            tests: [
              { name: 'test1', status: 'PASS', time: 10, failures: [] },
              {
                name: 'test2',
                status: 'FAIL',
                time: 20,
                failures: [{ text: 'Error message' }],
              },
              {
                name: 'test3',
                status: 'FAIL',
                time: 15,
                failures: [{ text: 'Error 2' }],
              },
              { name: 'test4', status: 'SKIP', time: 0, failures: [] },
            ],
          },
        ],
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSummaryFn.mockReturnValue('Test summary output');
  });

  it('should process test report and return incident', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result = await processIncidentFromTestReport({
      log: mockLog,
      service: 'my-service',
      sourcePath: '/path/to/reports',
      sourceType: 'xml',
    });

    expect(mockIngestReportFn).toHaveBeenCalledWith(
      'xml',
      '/path/to/reports',
      mockLog,
    );
    expect(result.service).toBe('my-service');
    expect(result.title).toContain('my-service');
    expect(result.title).toContain('2/10 FAILED tests');
    expect(result.counts).toEqual({
      fail: 2,
      skip: 1,
      success: 7,
      total: 10,
    });
  });

  it('should use singular "test" when only one failure', async () => {
    const mockReport = createMockReport({ failures: 1, tests: 5 });
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'json',
    });

    expect(result.title).toContain('1/5 FAILED test ');
  });

  it('should generate dedup key based on failed tests', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result1 = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    // Same failures should produce same dedup key
    const result2 = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    expect(result1.dedupKey).toBe(result2.dedupKey);
    expect(result1.dedupKey).toBeTruthy();
  });

  it('should generate different dedup keys for different services', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result1 = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service-a',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    const result2 = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service-b',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    expect(result1.dedupKey).not.toBe(result2.dedupKey);
  });

  it('should call getSummary with report and sourceType', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);

    await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'json',
    });

    expect(mockGetSummaryFn).toHaveBeenCalledWith({
      report: mockReport,
      sourceType: 'json',
    });
  });

  it('should set description from getSummary result', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);
    mockGetSummaryFn.mockReturnValue('Custom summary description');

    const result = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    expect(result.description).toBe('Custom summary description');
  });

  it('should set sourceUrl to empty string', async () => {
    const mockReport = createMockReport();
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    expect(result.sourceUrl).toBe('');
  });

  it('should handle report with no failures', async () => {
    const mockReport = createMockReport({
      failures: 0,
      skipped: 0,
      tests: 5,
      reports: [
        {
          name: 'Report',
          failures: 0,
          pending: 0,
          skipped: 0,
          tests: 5,
          time: 50,
          testsuites: [
            {
              name: 'Suite',
              failures: 0,
              pending: 0,
              skipped: 0,
              time: 50,
              timestamp: '2024-01-01T00:00:00Z',
              tests: [
                { name: 'test1', status: 'PASS', time: 10, failures: [] },
              ],
            },
          ],
        },
      ],
    });
    mockIngestReportFn.mockResolvedValue(mockReport);

    const result = await processIncidentFromTestReport({
      log: mockLog,
      service: 'service',
      sourcePath: '/path',
      sourceType: 'xml',
    });

    expect(result.counts.fail).toBe(0);
    expect(result.counts.success).toBe(5);
    expect(result.title).toContain('0/5 FAILED tests');
  });
});
