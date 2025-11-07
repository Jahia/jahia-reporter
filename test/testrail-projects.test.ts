import { createConfig } from '../src/utils/testrail/config.js';
import { getProjects } from '../src/utils/testrail/projects.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const { sendRequest } = jest.mocked(require('../src/utils/testrail/client.js'));

describe('TestRail Projects', () => {
  let config: ReturnType<typeof createConfig>;

  beforeEach(() => {
    config = createConfig(
      'https://test.testrail.io',
      'user@test.com',
      'password123',
    );
    jest.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should return projects when projects exist', () => {
      const mockProjectsResponse = {
        limit: 250,
        offset: 0,
        projects: [
          {
            id: 1,
            is_completed: false,
            name: 'Project 1',
            show_announcement: false,
            suite_mode: 1,
            url: 'url1',
          },
          {
            id: 2,
            is_completed: false,
            name: 'Project 2',
            show_announcement: false,
            suite_mode: 1,
            url: 'url2',
          },
        ],
        size: 2,
      };

      sendRequest.mockReturnValue(mockProjectsResponse);

      const result = getProjects(config);

      expect(sendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_projects',
        '',
      );
      expect(result).toEqual(mockProjectsResponse.projects);
    });

    it('should throw error when no projects exist', () => {
      const mockProjectsResponse = {
        limit: 250,
        offset: 0,
        projects: [],
        size: 0,
      };

      sendRequest.mockReturnValue(mockProjectsResponse);

      expect(() => getProjects(config)).toThrow(
        "Something went wrong. Can't find any project",
      );
      expect(sendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_projects',
        '',
      );
    });

    it('should handle empty projects array with size > 0', () => {
      const mockProjectsResponse = {
        limit: 250,
        offset: 0,
        projects: [
          {
            id: 1,
            is_completed: false,
            name: 'Project 1',
            show_announcement: false,
            suite_mode: 1,
            url: 'url1',
          },
        ],
        size: 1,
      };

      sendRequest.mockReturnValue(mockProjectsResponse);

      const result = getProjects(config);

      expect(result).toEqual(mockProjectsResponse.projects);
    });
  });
});
