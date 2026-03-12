import type { TestRailConfig, TestRailResult } from '../src/types/index.js';

import { addTestrailResults } from '../src/utils/testrail/results.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Results', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTestrailResults', () => {
    it('should add results for cases', async () => {
      const results: TestRailResult[] = [
        { case_id: 1, status_id: 1 },
        { case_id: 2, status_id: 5 },
      ];
      const mockResponse = [...results];
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailResults(mockConfig, 100, results);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_results_for_cases/100',
        { results },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle empty results array', async () => {
      mockSendRequest.mockReturnValue([]);

      const result = await addTestrailResults(mockConfig, 100, []);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_results_for_cases/100',
        { results: [] },
      );
      expect(result).toEqual([]);
    });

    it('should handle results with comments and elapsed time', async () => {
      const results: TestRailResult[] = [
        {
          case_id: 1,
          status_id: 1,
          comment: 'Test passed successfully',
          elapsed: '30s',
        },
        {
          case_id: 2,
          status_id: 5,
          comment: 'Test failed with error',
          elapsed: '1m 20s',
        },
      ];
      mockSendRequest.mockReturnValue(results);

      const result = await addTestrailResults(mockConfig, 200, results);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_results_for_cases/200',
        { results },
      );
      expect(result).toHaveLength(2);
    });

    it('should convert runId to string in endpoint', async () => {
      mockSendRequest.mockReturnValue([]);

      await addTestrailResults(mockConfig, 12345, []);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_results_for_cases/12345',
        expect.any(Object),
      );
    });
  });
});
