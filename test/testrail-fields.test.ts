import { createConfig } from '../src/utils/testrail/config.js';
import {
  clearFieldsCache,
  getCaseFields,
  getCustomStatus,
  getCustomVersion,
  getResultFields,
} from '../src/utils/testrail/fields.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const { sendRequest } = jest.mocked(require('../src/utils/testrail/client.js'));

describe('TestRail Fields', () => {
  let config: ReturnType<typeof createConfig>;

  beforeEach(() => {
    config = createConfig(
      'https://test.testrail.io',
      'user@test.com',
      'password123',
    );
    jest.clearAllMocks();
    clearFieldsCache(); // Clear the cache before each test
  });

  describe('getCaseFields', () => {
    it('should return case fields', () => {
      const mockFields = [
        { configs: [], id: 1, system_name: 'custom_status' },
        { configs: [], id: 2, system_name: 'custom_version' },
      ];

      sendRequest.mockReturnValue(mockFields);

      const result = getCaseFields(config);

      expect(sendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_case_fields',
        {},
      );
      expect(result).toEqual(mockFields);
    });
  });

  describe('getResultFields', () => {
    it('should return result fields', () => {
      const mockFields = [
        { configs: [], id: 1, system_name: 'custom_version' },
      ];

      sendRequest.mockReturnValue(mockFields);

      const result = getResultFields(config);

      expect(sendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_result_fields',
        {},
      );
      expect(result).toEqual(mockFields);
    });
  });

  describe('getCustomStatus', () => {
    it('should return status number for valid status', () => {
      const mockFields = [
        {
          configs: [
            {
              options: {
                items:
                  '1, Incomplete/draft\n2, Complete\n3, In progress\n4, Needs to be checked/reworked',
              },
            },
          ],
          id: 1,
          system_name: 'custom_status',
        },
      ];

      // Mock getCaseFields call within getCustomStatus
      sendRequest.mockReturnValue(mockFields);

      const result = getCustomStatus(config, 'Complete');

      expect(result).toBe(2);
    });

    it('should throw error when custom_status field not found', () => {
      const mockFields = [{ configs: [], id: 1, system_name: 'other_field' }];

      sendRequest.mockReturnValue(mockFields);

      expect(() => getCustomStatus(config, 'Complete')).toThrow(
        "Something went wrong. Can't find custom field 'custom_status'",
      );
    });

    it('should throw error when status not found', () => {
      const mockFields = [
        {
          configs: [
            {
              options: {
                items: '1, Incomplete/draft\n2, Complete\n3, In progress',
              },
            },
          ],
          id: 1,
          system_name: 'custom_status',
        },
      ];

      sendRequest.mockReturnValue(mockFields);

      expect(() => getCustomStatus(config, 'NonExistent')).toThrow(
        "Something went wrong. Can't find custom status NonExistent",
      );
    });

    it('should use cached fields on subsequent calls', () => {
      // This test verifies the caching behavior
      const mockFields = [
        {
          configs: [
            {
              options: {
                items: '1, Complete',
              },
            },
          ],
          id: 1,
          system_name: 'custom_status',
        },
      ];

      sendRequest.mockReturnValue(mockFields);

      // First call
      getCustomStatus(config, 'Complete');
      // Second call - should use cache
      getCustomStatus(config, 'Complete');

      // Should only call sendRequest once due to caching
      expect(sendRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCustomVersion', () => {
    it('should return version numbers for valid version', () => {
      const mockFields = [
        {
          configs: [
            {
              options: {
                items: '1, 7.2.0.0\n 2, 7.1.2.2\n3, 8.0.0.0',
              },
            },
          ],
          id: 1,
          system_name: 'custom_version',
        },
      ];

      sendRequest.mockReturnValue(mockFields);

      const result = getCustomVersion(config, '7.2.0.0');

      expect(result).toEqual([1]);
    });

    it('should throw error when custom_version field not found', () => {
      const mockFields = [{ configs: [], id: 1, system_name: 'other_field' }];

      sendRequest.mockReturnValue(mockFields);

      expect(() => getCustomVersion(config, '7.2.0.0')).toThrow(
        "Something went wrong. Can't find custom field 'custom_version'",
      );
    });

    it('should throw error when version not found', () => {
      const mockFields = [
        {
          configs: [
            {
              options: {
                items: '1, 7.2.0.0\n 2, 7.1.2.2',
              },
            },
          ],
          id: 1,
          system_name: 'custom_version',
        },
      ];

      sendRequest.mockReturnValue(mockFields);

      expect(() => getCustomVersion(config, '9.0.0.0')).toThrow(
        "Something went wrong. Can't find custom version 9.0.0.0",
      );
    });

    it('should handle version with spaces', () => {
      const mockFields = [
        {
          configs: [
            {
              options: {
                items: '1, 7.2.0.0\n 2, 7.1.2.2',
              },
            },
          ],
          id: 1,
          system_name: 'custom_version',
        },
      ];

      sendRequest.mockReturnValue(mockFields);

      const result = getCustomVersion(config, '7.1.2.2');

      expect(result).toEqual([2]);
    });
  });
});
