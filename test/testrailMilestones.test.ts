import type { TestRailConfig } from '../src/types/index.js';

import {
  addTestrailMilestone,
  getTestrailMilestones,
} from '../src/utils/testrail/milestones.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Milestones', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestrailMilestones', () => {
    it('should return milestones when size > 0', async () => {
      const mockMilestones = [
        { id: 1, name: 'Sprint 1', project_id: 10 },
        { id: 2, name: 'Sprint 2', project_id: 10 },
      ];
      mockSendRequest.mockReturnValue({
        limit: 250,
        milestones: mockMilestones,
        offset: 0,
        size: 2,
      });

      const result = await getTestrailMilestones(mockConfig, 10);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_milestones/10',
        '',
      );
      expect(result).toEqual(mockMilestones);
    });

    it('should return empty array when size is 0', async () => {
      mockSendRequest.mockReturnValue({
        limit: 250,
        milestones: [],
        offset: 0,
        size: 0,
      });

      const result = await getTestrailMilestones(mockConfig, 10);

      expect(result).toEqual([]);
    });

    it('should build correct URI with project ID', async () => {
      mockSendRequest.mockReturnValue({
        limit: 250,
        milestones: [],
        offset: 0,
        size: 0,
      });

      await getTestrailMilestones(mockConfig, 999);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_milestones/999',
        '',
      );
    });
  });

  describe('addTestrailMilestone', () => {
    it('should add a milestone and return the created milestone', async () => {
      const mockResponse = {
        id: 100,
        name: 'New Milestone',
        project_id: 10,
      };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailMilestone(
        mockConfig,
        10,
        'New Milestone',
      );

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_milestone/10',
        { name: 'New Milestone' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle special characters in milestone name', async () => {
      mockSendRequest.mockReturnValue({
        id: 101,
        name: 'Release v1.0.0 (Beta)',
        project_id: 20,
      });

      await addTestrailMilestone(mockConfig, 20, 'Release v1.0.0 (Beta)');

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_milestone/20',
        { name: 'Release v1.0.0 (Beta)' },
      );
    });
  });
});
