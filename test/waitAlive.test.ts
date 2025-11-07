import waitAlive from '../src/utils/waitAlive.js';

// Simple mock strategy to avoid memory issues
jest.mock('@oclif/core', () => ({
  ux: { action: { start: jest.fn(), stop: jest.fn() } },
}));

jest.mock('../src/utils/getGraphqlClient.js', () => ({
  getGraphqlClient: jest.fn(),
}));

jest.mock('../src/utils/sleep.js', () => ({
  sleep: jest.fn(),
}));

jest.mock('node:perf_hooks', () => ({
  performance: { now: jest.fn() },
}));

// Mock process.exit to prevent actual exit
const mockProcessExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((code?: number) => {
    throw new Error(`Process exit called with code: ${code}`);
  });

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('waitAlive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockProcessExit.mockRestore();
    mockConsoleLog.mockRestore();
  });

  it('should be importable and callable', async () => {
    // This is a simple test to ensure the function can be imported
    expect(typeof waitAlive).toBe('function');
    expect(waitAlive.length).toBe(4); // Should accept 4 parameters
  });

  it('should handle errors from getGraphqlClient', async () => {
    const { getGraphqlClient } = require('../src/utils/getGraphqlClient.js');
    getGraphqlClient.mockRejectedValue(new Error('Connection failed'));

    await expect(
      waitAlive('http://localhost:8080', 'root', 'root', 5000),
    ).rejects.toThrow('Connection failed');
  });

  it('should return true when Jahia is immediately available', async () => {
    const { getGraphqlClient } = require('../src/utils/getGraphqlClient.js');
    const { sleep } = require('../src/utils/sleep.js');
    const { performance } = require('node:perf_hooks');

    const mockClient = {
      query: jest.fn().mockResolvedValue({
        data: { jcr: { workspace: 'EDIT' } },
      }),
    };

    getGraphqlClient.mockResolvedValue(mockClient);
    sleep.mockResolvedValue();
    performance.now.mockReturnValue(1000);

    const result = await waitAlive(
      'http://localhost:8080',
      'root',
      'root',
      30_000,
    );

    expect(result).toBe(true);
    expect(getGraphqlClient).toHaveBeenCalledWith(
      'http://localhost:8080',
      'root',
      'root',
    );
    expect(mockClient.query).toHaveBeenCalled();
  });
});
