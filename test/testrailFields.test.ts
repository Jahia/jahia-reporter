import type {
  CaseFields,
  Project,
  TestRailConfig,
} from '../src/types/index.js';

import * as fs from 'node:fs';

import {
  getTestrailCaseFields,
  getTestrailCustomFields,
  getTestrailCustomStatus,
  getTestrailCustomVersion,
  getTestrailResultFields,
} from '../src/utils/testrail/fields.js';
import { sendRequest } from '../src/utils/testrail/client.js';
import { ux } from '@oclif/core';

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

// Mock fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  lstatSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<
  typeof fs.existsSync
>;
const mockLstatSync = fs.lstatSync as jest.MockedFunction<typeof fs.lstatSync>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

describe('TestRail Fields', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  const mockProject: Project = {
    id: 10,
    is_completed: false,
    name: 'Test Project',
    show_announcement: false,
    suite_mode: 3,
    url: 'https://testrail.example.com/index.php?/projects/overview/10',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestrailCaseFields', () => {
    it('should return case fields array', async () => {
      const mockFields = [
        {
          id: 1,
          name: 'Automated',
          system_name: 'custom_automated',
          type_id: 12,
        },
        { id: 2, name: 'Priority', system_name: 'priority_id', type_id: 6 },
      ];
      mockSendRequest.mockReturnValue(mockFields);

      const result = await getTestrailCaseFields(mockConfig);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_case_fields',
        {},
      );
      expect(result).toEqual(mockFields);
    });

    it('should return empty array when no fields', async () => {
      mockSendRequest.mockReturnValue([]);

      const result = await getTestrailCaseFields(mockConfig);

      expect(result).toEqual([]);
    });
  });

  describe('getTestrailResultFields', () => {
    it('should return decorated result fields', async () => {
      const rawFields = [
        {
          id: 1,
          name: 'Comment',
          system_name: 'custom_comment',
          type_id: 3,
          configs: [{ context: { is_global: true, project_ids: [] } }],
        },
      ];
      mockSendRequest.mockReturnValue(rawFields);

      const result = await getTestrailResultFields(mockConfig, mockProject, {
        custom_comment: 'Test comment',
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_result_fields',
        {},
      );
      expect(result[0].enabledOnProject).toBe(true);
      expect(result[0].type).toBe('Text');
      expect(result[0].value).toBe('Test comment');
    });

    it('should enable field for specific project', async () => {
      const rawFields = [
        {
          id: 1,
          name: 'Comment',
          system_name: 'custom_comment',
          type_id: 1,
          configs: [{ context: { is_global: false, project_ids: [10, 20] } }],
        },
      ];
      mockSendRequest.mockReturnValue(rawFields);

      const result = await getTestrailResultFields(mockConfig, mockProject, {});

      expect(result[0].enabledOnProject).toBe(true);
    });

    it('should not enable field for wrong project', async () => {
      const rawFields = [
        {
          id: 1,
          name: 'Comment',
          system_name: 'custom_comment',
          type_id: 1,
          configs: [{ context: { is_global: false, project_ids: [99] } }],
        },
      ];
      mockSendRequest.mockReturnValue(rawFields);

      const result = await getTestrailResultFields(mockConfig, mockProject, {});

      expect(result[0].enabledOnProject).toBe(false);
    });

    it('should handle missing custom field submission', async () => {
      const rawFields = [
        {
          id: 1,
          name: 'Comment',
          system_name: 'custom_comment',
          type_id: 1,
          configs: [{ context: { is_global: true, project_ids: [] } }],
        },
      ];
      mockSendRequest.mockReturnValue(rawFields);

      const result = await getTestrailResultFields(mockConfig, mockProject, {});

      expect(result[0].value).toBe('');
    });
  });

  describe('getTestrailCustomFields', () => {
    const mockLog = jest.fn();

    it('should return empty array when testrailCustomResultFields is empty', async () => {
      const result = await getTestrailCustomFields({
        config: mockConfig,
        log: mockLog,
        project: mockProject,
        testrailCustomResultFields: '',
      });

      expect(result).toEqual([]);
    });

    it('should return empty array when testrailCustomResultFields is undefined', async () => {
      const result = await getTestrailCustomFields({
        config: mockConfig,
        log: mockLog,
        project: mockProject,
        testrailCustomResultFields: undefined as unknown as string,
      });

      expect(result).toEqual([]);
    });

    it('should throw error when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(
        getTestrailCustomFields({
          config: mockConfig,
          log: mockLog,
          project: mockProject,
          testrailCustomResultFields: '/path/to/missing.json',
        }),
      ).rejects.toThrow(
        'Something went wrong. The provided path: /path/to/missing.json does not exist.',
      );
    });

    it('should throw error when path is not a file', async () => {
      mockExistsSync.mockReturnValue(true);
      mockLstatSync.mockReturnValue({ isFile: () => false } as fs.Stats);

      await expect(
        getTestrailCustomFields({
          config: mockConfig,
          log: mockLog,
          project: mockProject,
          testrailCustomResultFields: '/path/to/directory',
        }),
      ).rejects.toThrow(
        'Something went wrong. The provided path: /path/to/directory is not a file',
      );
    });

    it('should parse file and fetch custom fields', async () => {
      mockExistsSync.mockReturnValue(true);
      mockLstatSync.mockReturnValue({ isFile: () => true } as fs.Stats);
      mockReadFileSync.mockReturnValue(
        JSON.stringify({ custom_comment: 'test' }),
      );
      mockSendRequest.mockReturnValue([
        {
          id: 1,
          name: 'Comment',
          system_name: 'custom_comment',
          type_id: 3,
          configs: [{ context: { is_global: true, project_ids: [] } }],
        },
      ]);

      const result = await getTestrailCustomFields({
        config: mockConfig,
        log: mockLog,
        project: mockProject,
        testrailCustomResultFields: '/path/to/custom.json',
      });

      expect(ux.action.start).toHaveBeenCalledWith(
        'Fetching custom fields from Testrail',
      );
      expect(ux.action.stop).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should add version system field when present in submission', async () => {
      mockExistsSync.mockReturnValue(true);
      mockLstatSync.mockReturnValue({ isFile: () => true } as fs.Stats);
      mockReadFileSync.mockReturnValue(JSON.stringify({ version: '1.0.0' }));
      mockSendRequest.mockReturnValue([]);

      const result = await getTestrailCustomFields({
        config: mockConfig,
        log: mockLog,
        project: mockProject,
        testrailCustomResultFields: '/path/to/custom.json',
      });

      expect(result).toHaveLength(1);
      expect(result[0].system_name).toBe('version');
      expect(result[0].value).toBe('1.0.0');
    });
  });

  describe('getTestrailCustomStatus', () => {
    it('should return status ID for matching status', async () => {
      const caseFields: CaseFields[] = [
        {
          id: 1,
          system_name: 'custom_status',
          name: 'Status',
          configs: [
            {
              options: {
                items: '1, Incomplete/draft\n2, Complete\n3, In progress',
              },
            },
          ],
        } as unknown as CaseFields,
      ];

      const result = await getTestrailCustomStatus(caseFields, 'Complete');

      expect(result).toBe(2);
    });

    it('should throw error when custom_status field not found', async () => {
      const caseFields: CaseFields[] = [];

      await expect(
        getTestrailCustomStatus(caseFields, 'Complete'),
      ).rejects.toThrow(
        "Something went wrong. Can't find custom field 'custom_status'",
      );
    });

    it('should throw error when status not found in options', async () => {
      const caseFields: CaseFields[] = [
        {
          id: 1,
          system_name: 'custom_status',
          name: 'Status',
          configs: [
            {
              options: {
                items: '1, Incomplete/draft\n2, Complete',
              },
            },
          ],
        } as unknown as CaseFields,
      ];

      await expect(
        getTestrailCustomStatus(caseFields, 'Unknown'),
      ).rejects.toThrow(
        "Something went wrong. Can't find custom status Unknown",
      );
    });
  });

  describe('getTestrailCustomVersion', () => {
    it('should return version ID for matching version', async () => {
      const caseFields: CaseFields[] = [
        {
          id: 1,
          system_name: 'custom_version',
          name: 'Version',
          configs: [
            {
              options: {
                items: '1, 7.2.0.0\n2, 7.1.2.2\n3, 8.0.0.0',
              },
            },
          ],
        } as unknown as CaseFields,
      ];

      const result = await getTestrailCustomVersion(caseFields, '7.1.2.2');

      expect(result).toEqual([2]);
    });

    it('should throw error when custom_version field not found', async () => {
      const caseFields: CaseFields[] = [];

      await expect(
        getTestrailCustomVersion(caseFields, '1.0.0'),
      ).rejects.toThrow(
        "Something went wrong. Can't find custom field 'custom_version'",
      );
    });

    it('should throw error when version not found in options', async () => {
      const caseFields: CaseFields[] = [
        {
          id: 1,
          system_name: 'custom_version',
          name: 'Version',
          configs: [
            {
              options: {
                items: '1, 7.2.0.0\n2, 7.1.2.2',
              },
            },
          ],
        } as unknown as CaseFields,
      ];

      await expect(
        getTestrailCustomVersion(caseFields, '9.9.9.9'),
      ).rejects.toThrow(
        "Something went wrong. Can't find custom version 9.9.9.9",
      );
    });
  });
});
