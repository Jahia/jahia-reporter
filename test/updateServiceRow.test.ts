import { updateServiceRow } from '../src/utils/spreadsheet/updateServiceRow.js';
import type { Incident } from '../src/types/index.js';

describe('updateServiceRow', () => {
  const mockLog = jest.fn();

  const createMockIncident = (overrides: Partial<Incident> = {}): Incident => ({
    assignee: 'user',
    counts: { fail: 2, skip: 1, success: 7, total: 10 },
    dedupKey: 'key',
    description: 'Description',
    service: 'test-service',
    sourceUrl: 'https://ci.example.com/run/123',
    title: 'Test Incident',
    ...overrides,
  });

  const createMockRow = () => {
    const values: Record<string, unknown> = {};
    return {
      get: jest.fn((key: string) => values[key]),
      set: jest.fn((key: string, value: unknown) => {
        values[key] = value;
      }),
      save: jest.fn().mockResolvedValue(undefined),
      rowNumber: 5,
    };
  };

  const createMockWorksheet = (
    rows: Array<ReturnType<typeof createMockRow>> = [],
  ) => ({
    getRows: jest.fn().mockResolvedValue(rows),
    addRow: jest.fn().mockResolvedValue({ rowNumber: 10 }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update existing row when service is found', async () => {
    const mockRow = createMockRow();
    mockRow.get.mockImplementation((key: string) => {
      if (key === 'Test Service') return 'my-service';
      return undefined;
    });

    const mockWorksheet = createMockWorksheet([mockRow]);
    const incident = createMockIncident();

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'my-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockRow.set).toHaveBeenCalledWith('Repository', 'my-repo');
    expect(mockRow.set).toHaveBeenCalledWith('State', 'FAILED');
    expect(mockRow.set).toHaveBeenCalledWith('Total', 10);
    expect(mockRow.set).toHaveBeenCalledWith('Failures', 2);
    expect(mockRow.set).toHaveBeenCalledWith(
      'Link',
      'https://ci.example.com/run/123',
    );
    expect(mockRow.set).toHaveBeenCalledWith('Updated', expect.any(String));
    expect(mockRow.save).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Updated service my-service located at row number: 5',
    );
  });

  it('should set state to PASSED when no failures', async () => {
    const mockRow = createMockRow();
    mockRow.get.mockImplementation((key: string) => {
      if (key === 'Test Service') return 'my-service';
      return undefined;
    });

    const mockWorksheet = createMockWorksheet([mockRow]);
    const incident = createMockIncident({
      counts: { fail: 0, skip: 0, success: 10, total: 10 },
    });

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'my-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockRow.set).toHaveBeenCalledWith('State', 'PASSED');
  });

  it('should create new row when service is not found', async () => {
    const mockWorksheet = createMockWorksheet([]);
    const incident = createMockIncident();

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'new-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockWorksheet.addRow).toHaveBeenCalledWith({
      Failures: 2,
      Repository: 'my-repo',
      Link: 'https://ci.example.com/run/123',
      State: 'FAILED',
      'Test Service': 'new-service',
      Total: 10,
      Updated: expect.any(String),
    });
    expect(mockLog).toHaveBeenCalledWith(
      'No existing row for service new-service',
    );
    expect(mockLog).toHaveBeenCalledWith(
      'Created new row for service new-service located at row number: 10',
    );
  });

  it('should create new row with PASSED state when no failures', async () => {
    const mockWorksheet = createMockWorksheet([]);
    const incident = createMockIncident({
      counts: { fail: 0, skip: 0, success: 5, total: 5 },
    });

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockWorksheet.addRow).toHaveBeenCalledWith(
      expect.objectContaining({
        State: 'PASSED',
      }),
    );
  });

  it('should search through multiple rows to find service', async () => {
    const row1 = createMockRow();
    row1.get.mockImplementation((key: string) => {
      if (key === 'Test Service') return 'other-service';
      return undefined;
    });

    const row2 = createMockRow();
    row2.get.mockImplementation((key: string) => {
      if (key === 'Test Service') return 'my-service';
      return undefined;
    });
    row2.rowNumber = 7;

    const mockWorksheet = createMockWorksheet([row1, row2]);
    const incident = createMockIncident();

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'my-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(row1.save).not.toHaveBeenCalled();
    expect(row2.save).toHaveBeenCalled();
    expect(mockLog).toHaveBeenCalledWith(
      'Found service my-service at row number: 7',
    );
  });

  it('should log when searching for service', async () => {
    const mockWorksheet = createMockWorksheet([]);
    const incident = createMockIncident();

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'test-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockLog).toHaveBeenCalledWith(
      'Searching for row matching service: test-service',
    );
  });

  it('should log when no service row found', async () => {
    const mockWorksheet = createMockWorksheet([]);
    const incident = createMockIncident();

    await updateServiceRow({
      worksheet: mockWorksheet,
      service: 'missing-service',
      incidentContent: incident,
      repository: 'my-repo',
      log: mockLog,
    });

    expect(mockLog).toHaveBeenCalledWith(
      'No service row found for: missing-service',
    );
  });
});
