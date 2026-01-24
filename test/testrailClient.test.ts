import type { TestRailConfig } from '../src/types/index.js';

import { sendRequest } from '../src/utils/testrail/client.js';

// Mock SyncRequestClient
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockAddHeader = jest.fn().mockReturnThis();

jest.mock('ts-sync-request/dist/index.js', () => ({
  SyncRequestClient: jest.fn().mockImplementation(() => ({
    addHeader: mockAddHeader,
    get: mockGet,
    post: mockPost,
  })),
}));

// Mock Atomics.wait to avoid actual waiting
const originalAtomicsWait = Atomics.wait;

describe('TestRail Client', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Atomics.wait to return immediately
    (Atomics as { wait: typeof Atomics.wait }).wait = jest
      .fn()
      .mockReturnValue('ok');
  });

  afterEach(() => {
    (Atomics as { wait: typeof Atomics.wait }).wait = originalAtomicsWait;
  });

  describe('sendRequest', () => {
    describe('GET requests', () => {
      it('should send GET request with correct headers', () => {
        const mockResponse = { data: 'test' };
        mockGet.mockReturnValue(mockResponse);

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(mockAddHeader).toHaveBeenCalledWith(
          'Authorization',
          'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
        );
        expect(mockAddHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/json',
        );
        expect(mockGet).toHaveBeenCalledWith(
          'https://testrail.example.com/index.php?/api/v2/get_projects',
        );
        expect(result).toEqual(mockResponse);
      });

      it('should return response data on successful GET', () => {
        const mockProjects = [
          { id: 1, name: 'Project 1' },
          { id: 2, name: 'Project 2' },
        ];
        mockGet.mockReturnValue(mockProjects);

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(result).toEqual(mockProjects);
      });
    });

    describe('POST requests', () => {
      it('should send POST request with correct headers and data', () => {
        const mockResponse = { id: 100, name: 'New Case' };
        mockPost.mockReturnValue(mockResponse);
        const postData = { title: 'Test Case', section_id: 1 };

        const result = sendRequest(mockConfig, 'POST', 'add_case/1', postData);

        expect(mockAddHeader).toHaveBeenCalledWith(
          'Authorization',
          'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
        );
        expect(mockAddHeader).toHaveBeenCalledWith(
          'Content-Type',
          'application/json',
        );
        expect(mockPost).toHaveBeenCalledWith(
          'https://testrail.example.com/index.php?/api/v2/add_case/1',
          postData,
        );
        expect(result).toEqual(mockResponse);
      });
    });

    describe('error handling', () => {
      it('should retry on 429 rate limit error', () => {
        const rateLimitError = {
          statusCode: 429,
          message: 'Rate limit exceeded',
        };
        mockGet
          .mockImplementationOnce(() => {
            throw rateLimitError;
          })
          .mockReturnValueOnce({ data: 'success' });

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(Atomics.wait).toHaveBeenCalled();
        expect(result).toEqual({ data: 'success' });
      });

      it('should retry on other errors with random wait', () => {
        const genericError = { statusCode: 500, message: 'Server error' };
        mockGet
          .mockImplementationOnce(() => {
            throw genericError;
          })
          .mockReturnValueOnce({ data: 'success' });

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(Atomics.wait).toHaveBeenCalled();
        expect(result).toEqual({ data: 'success' });
      });

      it('should return null after max retries', () => {
        const error = { message: 'Persistent error' };
        mockGet.mockImplementation(() => {
          throw error;
        });

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(result).toBeNull();
        expect(mockGet).toHaveBeenCalledTimes(5);
      });

      it('should handle error without message property', () => {
        mockGet
          .mockImplementationOnce(() => {
            throw new Error('Standard error');
          })
          .mockReturnValueOnce({ data: 'success' });

        const result = sendRequest(mockConfig, 'GET', 'get_projects', '');

        expect(result).toEqual({ data: 'success' });
      });
    });

    describe('unsupported methods', () => {
      it('should return null for unsupported HTTP methods', () => {
        const result = sendRequest(mockConfig, 'DELETE', 'delete_case/1', '');

        expect(result).toBeNull();
        expect(mockGet).not.toHaveBeenCalled();
        expect(mockPost).not.toHaveBeenCalled();
      });

      it('should return null for PUT method', () => {
        const result = sendRequest(mockConfig, 'PUT', 'update_case/1', {
          name: 'test',
        });

        expect(result).toBeNull();
      });
    });
  });
});
