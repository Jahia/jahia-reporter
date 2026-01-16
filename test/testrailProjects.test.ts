import { ux } from '@oclif/core';

import type {
  PaginatedProjects,
  Project,
  TestRailConfig,
} from '../src/types/index.js';

import {
  getTestrailProject,
  getTestrailProjects,
} from '../src/utils/testrail/projects.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

// Mock @oclif/core
jest.mock('@oclif/core', () => ({
  ux: {
    action: {
      start: jest.fn(),
      stop: jest.fn(),
    },
  },
}));

const mockSendRequest = require('../src/utils/testrail/client.js').sendRequest;
const mockUx = ux as jest.Mocked<typeof ux>;

describe('TestRail Projects', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com/',
    enableRateLimiting: false,
    encodedAuth: 'encoded_auth',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  const mockProjects: Project[] = [
    {
      id: 1,
      is_completed: false,
      name: 'Project Alpha',
      show_announcement: false,
      suite_mode: 1,
      url: 'https://testrail.example.com/project/1',
    },
    {
      id: 2,
      is_completed: false,
      name: 'Project Beta',
      show_announcement: false,
      suite_mode: 2,
      url: 'https://testrail.example.com/project/2',
    },
    {
      id: 3,
      is_completed: false,
      name: 'Sandbox Module',
      show_announcement: false,
      suite_mode: 1,
      url: 'https://testrail.example.com/project/3',
    },
  ];

  const mockPaginatedProjects: PaginatedProjects = {
    limit: 250,
    offset: 0,
    projects: mockProjects,
    size: mockProjects.length,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestrailProjects', () => {
    it('should return projects when API call succeeds and projects exist', async () => {
      mockSendRequest.mockResolvedValue(mockPaginatedProjects);

      const result = await getTestrailProjects(mockConfig);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_projects',
        '',
      );
      expect(result).toEqual(mockProjects);
    });

    it('should throw error when no projects found (size = 0)', async () => {
      const emptyPaginatedProjects: PaginatedProjects = {
        ...mockPaginatedProjects,
        projects: [],
        size: 0,
      };
      mockSendRequest.mockResolvedValue(emptyPaginatedProjects);

      await expect(getTestrailProjects(mockConfig)).rejects.toThrow(
        "Something went wrong. Can't find any project",
      );

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_projects',
        '',
      );
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('API connection failed');
      mockSendRequest.mockRejectedValue(apiError);

      await expect(getTestrailProjects(mockConfig)).rejects.toThrow(
        'API connection failed',
      );
    });

    it('should handle empty projects array but size > 0', async () => {
      const inconsistentPaginatedProjects: PaginatedProjects = {
        ...mockPaginatedProjects,
        projects: [],
        size: 1, // Size says there are projects but array is empty
      };
      mockSendRequest.mockResolvedValue(inconsistentPaginatedProjects);

      const result = await getTestrailProjects(mockConfig);

      expect(result).toEqual([]);
    });
  });

  describe('getTestrailProject', () => {
    const mockLog = jest.fn();

    beforeEach(() => {
      mockSendRequest.mockResolvedValue(mockPaginatedProjects);
    });

    it('should successfully find and return a project by exact name', async () => {
      const result = await getTestrailProject(
        mockConfig,
        'Sandbox Module',
        mockLog,
      );

      expect(mockUx.action.start).toHaveBeenCalledWith(
        'Searching project: Sandbox Module in Testrail',
      );
      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_projects',
        '',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'List of projects in Testrail: Project Alpha, Project Beta, Sandbox Module',
      );
      expect(result).toEqual(mockProjects[2]); // Sandbox Module
      expect(mockUx.action.stop).toHaveBeenCalledWith(
        'Project found: Sandbox Module with URL: https://testrail.example.com/project/3',
      );
    });

    it('should successfully find the first project when multiple projects exist', async () => {
      const result = await getTestrailProject(
        mockConfig,
        'Project Alpha',
        mockLog,
      );

      expect(result).toEqual(mockProjects[0]);
      expect(mockUx.action.start).toHaveBeenCalledWith(
        'Searching project: Project Alpha in Testrail',
      );
      expect(mockUx.action.stop).toHaveBeenCalledWith(
        'Project found: Project Alpha with URL: https://testrail.example.com/project/1',
      );
    });

    it('should throw error when project is not found', async () => {
      await expect(
        getTestrailProject(mockConfig, 'Nonexistent Project', mockLog),
      ).rejects.toThrow("Failed to find project named 'Nonexistent Project'");

      expect(mockUx.action.start).toHaveBeenCalledWith(
        'Searching project: Nonexistent Project in Testrail',
      );
      expect(mockLog).toHaveBeenCalledWith(
        'List of projects in Testrail: Project Alpha, Project Beta, Sandbox Module',
      );
      // action.stop should not be called when project is not found
      expect(mockUx.action.stop).not.toHaveBeenCalled();
    });

    it('should be case sensitive when searching for projects', async () => {
      await expect(
        getTestrailProject(mockConfig, 'sandbox module', mockLog),
      ).rejects.toThrow("Failed to find project named 'sandbox module'");

      expect(mockLog).toHaveBeenCalledWith(
        'List of projects in Testrail: Project Alpha, Project Beta, Sandbox Module',
      );
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('Network timeout');
      mockSendRequest.mockRejectedValue(apiError);

      await expect(
        getTestrailProject(mockConfig, 'Any Project', mockLog),
      ).rejects.toThrow('Network timeout');

      expect(mockUx.action.start).toHaveBeenCalledWith(
        'Searching project: Any Project in Testrail',
      );
      expect(mockUx.action.stop).not.toHaveBeenCalled();
    });

    it('should handle empty project list gracefully', async () => {
      mockSendRequest.mockRejectedValue(
        new Error("Something went wrong. Can't find any project"),
      );

      await expect(
        getTestrailProject(mockConfig, 'Any Project', mockLog),
      ).rejects.toThrow("Something went wrong. Can't find any project");
    });

    it('should handle projects with special characters in names', async () => {
      const specialProjects: Project[] = [
        {
          id: 1,
          is_completed: false,
          name: 'Project with "quotes" & symbols!',
          show_announcement: false,
          suite_mode: 1,
          url: 'https://testrail.example.com/project/1',
        },
        {
          id: 2,
          is_completed: false,
          name: 'Project-with-dashes_and_underscores',
          show_announcement: false,
          suite_mode: 1,
          url: 'https://testrail.example.com/project/2',
        },
      ];

      const specialPaginatedProjects: PaginatedProjects = {
        ...mockPaginatedProjects,
        projects: specialProjects,
        size: specialProjects.length,
      };

      mockSendRequest.mockResolvedValue(specialPaginatedProjects);

      const result = await getTestrailProject(
        mockConfig,
        'Project with "quotes" & symbols!',
        mockLog,
      );

      expect(result).toEqual(specialProjects[0]);
      expect(mockLog).toHaveBeenCalledWith(
        'List of projects in Testrail: Project with "quotes" & symbols!, Project-with-dashes_and_underscores',
      );
    });

    it('should handle very long project names', async () => {
      const longProjectName = 'A'.repeat(200); // Very long project name
      const longNameProjects: Project[] = [
        {
          id: 1,
          is_completed: false,
          name: longProjectName,
          show_announcement: false,
          suite_mode: 1,
          url: 'https://testrail.example.com/project/1',
        },
      ];

      const longNamePaginatedProjects: PaginatedProjects = {
        ...mockPaginatedProjects,
        projects: longNameProjects,
        size: longNameProjects.length,
      };

      mockSendRequest.mockResolvedValue(longNamePaginatedProjects);

      const result = await getTestrailProject(
        mockConfig,
        longProjectName,
        mockLog,
      );

      expect(result).toEqual(longNameProjects[0]);
      expect(mockUx.action.start).toHaveBeenCalledWith(
        `Searching project: ${longProjectName} in Testrail`,
      );
    });

    it('should call log function exactly once with correct project list', async () => {
      await getTestrailProject(mockConfig, 'Project Beta', mockLog);

      expect(mockLog).toHaveBeenCalledTimes(1);
      expect(mockLog).toHaveBeenCalledWith(
        'List of projects in Testrail: Project Alpha, Project Beta, Sandbox Module',
      );
    });

    it('should handle projects with standard properties', async () => {
      const standardProjects: Project[] = [
        {
          id: 1,
          is_completed: false,
          name: 'Test Project',
          show_announcement: false,
          suite_mode: 1,
          url: 'https://testrail.example.com/project/1',
        },
      ];

      const standardPaginatedProjects: PaginatedProjects = {
        ...mockPaginatedProjects,
        projects: standardProjects,
        size: standardProjects.length,
      };

      mockSendRequest.mockResolvedValue(standardPaginatedProjects);

      const result = await getTestrailProject(
        mockConfig,
        'Test Project',
        mockLog,
      );

      expect(result).toEqual(standardProjects[0]);
      expect(result.is_completed).toBe(false);
      expect(result.show_announcement).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    const mockLog = jest.fn();

    it('should preserve original error when getTestrailProjects fails', async () => {
      const originalError = new Error('Connection refused');
      mockSendRequest.mockRejectedValue(originalError);

      await expect(
        getTestrailProject(mockConfig, 'Any Project', mockLog),
      ).rejects.toBe(originalError);
    });

    it('should handle undefined project name gracefully', async () => {
      mockSendRequest.mockResolvedValue(mockPaginatedProjects);

      await expect(
        getTestrailProject(mockConfig, undefined as any, mockLog),
      ).rejects.toThrow("Failed to find project named 'undefined'");
    });

    it('should handle empty string project name', async () => {
      mockSendRequest.mockResolvedValue(mockPaginatedProjects);

      await expect(getTestrailProject(mockConfig, '', mockLog)).rejects.toThrow(
        "Failed to find project named ''",
      );
    });

    it('should handle whitespace-only project name', async () => {
      mockSendRequest.mockResolvedValue(mockPaginatedProjects);

      await expect(
        getTestrailProject(mockConfig, '   ', mockLog),
      ).rejects.toThrow("Failed to find project named '   '");
    });
  });
});
