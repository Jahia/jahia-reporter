import type { TestRailConfig } from '../src/types/index.js';

import {
  addTestrailCase,
  getTestrailCases,
} from '../src/utils/testrail/cases.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Cases', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTestrailCases', () => {
    it('should return cases when size > 0', async () => {
      const mockCases = [
        { id: 1, section: 'Section1', time: '10', title: 'Test 1' },
        { id: 2, section: 'Section1', time: '20', title: 'Test 2' },
      ];
      mockSendRequest.mockReturnValue({
        cases: mockCases,
        limit: 250,
        offset: 0,
        size: 2,
      });

      const result = await getTestrailCases(mockConfig, 1, 2, 3);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_cases/1&suite_id=2&section_id=3',
        '',
      );
      expect(result).toEqual(mockCases);
    });

    it('should return empty array when size is 0', async () => {
      mockSendRequest.mockReturnValue({
        cases: [],
        limit: 250,
        offset: 0,
        size: 0,
      });

      const result = await getTestrailCases(mockConfig, 1, 2, 3);

      expect(result).toEqual([]);
    });

    it('should build correct URI with project, suite and section IDs', async () => {
      mockSendRequest.mockReturnValue({
        cases: [],
        limit: 250,
        offset: 0,
        size: 0,
      });

      await getTestrailCases(mockConfig, 123, 456, 789);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_cases/123&suite_id=456&section_id=789',
        '',
      );
    });
  });

  describe('addTestrailCase', () => {
    it('should add a case and return the created test', async () => {
      const mockAddCase = {
        custom_status: 1,
        custom_version: [1, 2],
        title: 'New Test Case',
      };
      const mockResponse = {
        id: 100,
        section: 'Section1',
        time: '0',
        title: 'New Test Case',
      };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailCase(mockConfig, 42, mockAddCase);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_case/42',
        mockAddCase,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include custom_steps_separated when provided', async () => {
      const mockAddCase = {
        custom_status: 1,
        custom_steps_separated: [
          { content: 'Step 1', expected: 'Result 1' },
          { content: 'Step 2', expected: 'Result 2' },
        ],
        custom_version: [1],
        title: 'Test with Steps',
      };
      mockSendRequest.mockReturnValue({ id: 101, title: 'Test with Steps' });

      await addTestrailCase(mockConfig, 50, mockAddCase);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_case/50',
        mockAddCase,
      );
    });
  });
});
