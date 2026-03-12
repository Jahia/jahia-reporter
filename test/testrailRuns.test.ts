import type { AddRun, Run, TestRailConfig } from '../src/types/index.js';

import {
  addTestrailRun,
  closeTestrailRun,
} from '../src/utils/testrail/runs.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Runs', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addTestrailRun', () => {
    it('should create a new test run', async () => {
      const addRun: AddRun = {
        name: 'Test Run 1',
        suite_id: 10,
        description: 'Automated test run',
      };
      const mockResponse: Run = {
        id: 100,
      };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailRun(mockConfig, 5, addRun);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_run/5',
        addRun,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should create run with milestone', async () => {
      const addRun: AddRun = {
        description: 'Test run with milestone',
        name: 'Milestone Run',
        suite_id: 10,
        milestone_id: 50,
      };
      const mockResponse: Run = {
        id: 101,
      };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailRun(mockConfig, 5, addRun);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_run/5',
        addRun,
      );
      expect(result.id).toBe(101);
    });

    it('should convert projectId to string in endpoint', async () => {
      const addRun: AddRun = {
        description: 'Test description',
        name: 'Test',
        suite_id: 1,
      };
      mockSendRequest.mockReturnValue({ id: 1 });

      await addTestrailRun(mockConfig, 12345, addRun);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_run/12345',
        expect.any(Object),
      );
    });
  });

  describe('closeTestrailRun', () => {
    it('should close a test run', async () => {
      const mockResponse: Run = {
        id: 100,
      };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await closeTestrailRun(mockConfig, 100);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'close_run/100',
        '/runs/close/100',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should convert runId to string in endpoint', async () => {
      mockSendRequest.mockReturnValue({ id: 99999 });

      await closeTestrailRun(mockConfig, 99999);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'close_run/99999',
        '/runs/close/99999',
      );
    });
  });
});
