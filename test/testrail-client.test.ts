import { sendRequest } from '../src/utils/testrail/client.js';
import { createConfig } from '../src/utils/testrail/config.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

const { sendRequest: mockedSendRequest } = jest.mocked(
  require('../src/utils/testrail/client.js'),
);

describe('TestRail Client', () => {
  let config: ReturnType<typeof createConfig>;

  beforeEach(() => {
    config = createConfig(
      'https://test.testrail.io',
      'user@test.com',
      'password123',
    );
    jest.clearAllMocks();
  });

  describe('sendRequest', () => {
    it('should handle GET requests', () => {
      const mockData = { id: 1, name: 'Test Project' };
      mockedSendRequest.mockReturnValue(mockData);

      const result = sendRequest(config, 'GET', 'get_projects', {});

      expect(mockedSendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_projects',
        {},
      );
      expect(result).toEqual(mockData);
    });

    it('should handle POST requests', () => {
      const mockData = { id: 1, name: 'New Test' };
      const postData = { priority: 1, title: 'Test Case' };
      mockedSendRequest.mockReturnValue(mockData);

      const result = sendRequest(config, 'POST', 'add_case/1', postData);

      expect(mockedSendRequest).toHaveBeenCalledWith(
        config,
        'POST',
        'add_case/1',
        postData,
      );
      expect(result).toEqual(mockData);
    });

    it('should handle empty data objects', () => {
      const mockData = { projects: [] };
      mockedSendRequest.mockReturnValue(mockData);

      const result = sendRequest(config, 'GET', 'get_projects', {});

      expect(mockedSendRequest).toHaveBeenCalledWith(
        config,
        'GET',
        'get_projects',
        {},
      );
      expect(result).toEqual(mockData);
    });
  });
});
