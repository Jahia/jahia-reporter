import { resolveIncidents } from '../src/utils/pagerduty/resolveIncidents.js';

// Mock sleep
jest.mock('../src/utils/sleep.js', () => ({
  sleep: jest.fn(),
}));

describe('resolveIncidents', () => {
  const mockAll = jest.fn();
  const mockPut = jest.fn();
  const mockPdClient = {
    all: mockAll,
    put: mockPut,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should resolve open incidents for the test service', async () => {
    mockAll.mockResolvedValue({
      data: [
        {
          incidents: [
            { id: 'inc-1', title: 'my-service - Tests: failed' },
            { id: 'inc-2', title: 'other-service - Tests: failed' },
          ],
        },
      ],
    });
    mockPut.mockResolvedValue({
      data: {
        incident: {
          incident_number: 123,
        },
      },
    });

    await resolveIncidents(
      mockPdClient,
      'service-id',
      'my-service',
      'https://ci.example.com/run/1',
    );

    expect(mockAll).toHaveBeenCalledWith(
      '/incidents?service_ids%5B%5D=service-id&statuses%5B%5D=acknowledged&statuses%5B%5D=triggered',
    );
    expect(mockPut).toHaveBeenCalledWith('/incidents/inc-1', {
      data: {
        incident: {
          resolution: expect.stringContaining('https://ci.example.com/run/1'),
          status: 'resolved',
          type: 'incident',
        },
      },
    });
    expect(mockPut).toHaveBeenCalledTimes(1); // Only my-service, not other-service
  });

  it('should not resolve incidents when none match the test service', async () => {
    mockAll.mockResolvedValue({
      data: [
        {
          incidents: [{ id: 'inc-1', title: 'other-service - Tests: failed' }],
        },
      ],
    });

    await resolveIncidents(
      mockPdClient,
      'service-id',
      'my-service',
      'https://ci.example.com',
    );

    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle empty incidents array', async () => {
    mockAll.mockResolvedValue({
      data: [{ incidents: [] }],
    });

    await resolveIncidents(
      mockPdClient,
      'service-id',
      'test-service',
      'https://url',
    );

    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle missing incidents property', async () => {
    mockAll.mockResolvedValue({
      data: [{ someOtherProperty: 'value' }],
    });

    await resolveIncidents(
      mockPdClient,
      'service-id',
      'test-service',
      'https://url',
    );

    expect(mockPut).not.toHaveBeenCalled();
  });

  it('should handle multiple matching incidents', async () => {
    mockAll.mockResolvedValue({
      data: [
        {
          incidents: [
            { id: 'inc-1', title: 'my-service - Tests: test1' },
            { id: 'inc-2', title: 'my-service - Tests: test2' },
          ],
        },
      ],
    });
    mockPut.mockResolvedValue({
      data: {
        incident: {
          incident_number: 1,
        },
      },
    });

    await resolveIncidents(
      mockPdClient,
      'service-id',
      'my-service',
      'https://url',
    );

    expect(mockPut).toHaveBeenCalledTimes(2);
    expect(mockPut).toHaveBeenCalledWith(
      '/incidents/inc-1',
      expect.any(Object),
    );
    expect(mockPut).toHaveBeenCalledWith(
      '/incidents/inc-2',
      expect.any(Object),
    );
  });

  it('should handle failed resolution gracefully', async () => {
    mockAll.mockResolvedValue({
      data: [
        {
          incidents: [{ id: 'inc-1', title: 'my-service - Tests: test' }],
        },
      ],
    });
    mockPut.mockResolvedValue({
      data: undefined,
    });

    // Should not throw
    await expect(
      resolveIncidents(mockPdClient, 'service-id', 'my-service', 'https://url'),
    ).resolves.not.toThrow();
  });

  it('should handle data with nested incident undefined', async () => {
    mockAll.mockResolvedValue({
      data: [
        {
          incidents: [{ id: 'inc-1', title: 'my-service - Tests: test' }],
        },
      ],
    });
    mockPut.mockResolvedValue({
      data: {
        incident: undefined,
      },
    });

    await expect(
      resolveIncidents(mockPdClient, 'service-id', 'my-service', 'https://url'),
    ).resolves.not.toThrow();
  });

  it('should flatten incidents from multiple data items', async () => {
    mockAll.mockResolvedValue({
      data: [
        { incidents: [{ id: 'inc-1', title: 'svc - Tests: a' }] },
        { incidents: [{ id: 'inc-2', title: 'svc - Tests: b' }] },
      ],
    });
    mockPut.mockResolvedValue({
      data: { incident: { incident_number: 1 } },
    });

    await resolveIncidents(mockPdClient, 'service-id', 'svc', 'https://url');

    expect(mockPut).toHaveBeenCalledTimes(2);
  });
});
