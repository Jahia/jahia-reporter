import { ux } from '@oclif/core';

import type { Project, TestRailConfig } from '../src/types/index.js';

import {
  getTestrailSuite,
  getTestrailSuites,
} from '../src/utils/testrail/suites.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

// Mock ux.action
jest.mock('@oclif/core', () => ({
  ux: {
    action: {
      start: jest.fn(),
      stop: jest.fn(),
    },
  },
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Suites', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  const mockProject: Project = {
    id: 1,
    is_completed: false,
    name: 'Test Project',
    show_announcement: false,
    suite_mode: 3,
    url: 'https://testrail.example.com/index.php?/projects/overview/1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestrailSuites', () => {
    it('should return suites from API response', async () => {
      const mockSuites = [
        { id: 1, name: 'Suite A' },
        { id: 2, name: 'Suite B' },
      ];
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 2,
        suites: mockSuites,
      });

      const result = await getTestrailSuites(mockConfig, 1);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_suites/1',
        '',
      );
      expect(result).toEqual(mockSuites);
    });

    it('should build correct URI with project ID', async () => {
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 0,
        suites: [],
      });

      await getTestrailSuites(mockConfig, 123);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_suites/123',
        '',
      );
    });
  });

  describe('getTestrailSuite', () => {
    const mockLog = jest.fn();

    it('should find and return existing suite', async () => {
      const mockSuites = [
        { id: 1, name: 'Suite A' },
        { id: 2, name: 'Target Suite' },
        { id: 3, name: 'Suite C' },
      ];
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 3,
        suites: mockSuites,
      });

      const result = await getTestrailSuite(
        mockConfig,
        mockProject,
        'Target Suite',
        mockLog,
      );

      expect(ux.action.start).toHaveBeenCalledWith(
        'Searching suite: Target Suite in Testrail',
      );
      expect(ux.action.stop).toHaveBeenCalledWith(
        'Suite found: Target Suite with ID: 2',
      );
      expect(result).toEqual({ id: 2, name: 'Target Suite' });
    });

    it('should log list of available suites', async () => {
      const mockSuites = [
        { id: 1, name: 'Suite A' },
        { id: 2, name: 'Suite B' },
      ];
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 2,
        suites: mockSuites,
      });

      await getTestrailSuite(mockConfig, mockProject, 'Suite A', mockLog);

      expect(mockLog).toHaveBeenCalledWith(
        'List of suites in Testrail: Suite A, Suite B',
      );
    });

    it('should throw error when suite not found', async () => {
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 2,
        suites: [
          { id: 1, name: 'Suite A' },
          { id: 2, name: 'Suite B' },
        ],
      });

      await expect(
        getTestrailSuite(mockConfig, mockProject, 'Nonexistent Suite', mockLog),
      ).rejects.toThrow(
        "Failed to find suite named: 'Nonexistent Suite' in project: 'Test Project'",
      );
    });

    it('should start action with suite name', async () => {
      mockSendRequest.mockReturnValue({
        limit: 250,
        offset: 0,
        size: 1,
        suites: [{ id: 1, name: 'My Suite' }],
      });

      await getTestrailSuite(mockConfig, mockProject, 'My Suite', mockLog);

      expect(ux.action.start).toHaveBeenCalledWith(
        'Searching suite: My Suite in Testrail',
      );
    });
  });
});
