import { Client } from '@urql/core';

import { getGraphqlClient } from '../src/utils/getGraphqlClient.js';

// Mock the @urql/core module
jest.mock('@urql/core', () => ({
  Client: jest.fn(),
  fetchExchange: {},
}));

// Mock gql.tada
jest.mock('gql.tada', () => ({
  graphql: jest.fn((query: string) => query),
}));

// Mock js-base64
jest.mock('js-base64', () => ({
  Base64: {
    btoa: jest.fn((input: string) => `encoded_${input}`),
  },
}));

describe('getGraphqlClient', () => {
  let mockClient: jest.Mocked<Client>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock query function
    mockQuery = jest.fn();

    // Create a mock client with the query method
    mockClient = {
      query: mockQuery,
    } as any;

    // Mock the Client constructor to return our mock client
    (Client as jest.MockedClass<typeof Client>).mockImplementation(
      () => mockClient,
    );
  });

  describe('successful authentication', () => {
    it('should create and return a GraphQL client with valid credentials', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      const result = await getGraphqlClient(
        jahiaUrl,
        jahiaUsername,
        jahiaPassword,
      );

      // Assert
      expect(result).toBe(mockClient);
      expect(Client).toHaveBeenCalledWith({
        exchanges: [{}], // fetchExchange is mocked as {}
        fetchOptions: {
          headers: {
            Authorization: `Basic encoded_${jahiaUsername}:${jahiaPassword}`,
            'Content-Type': 'application/json',
            Origin: jahiaUrl,
          },
        },
        url: `${jahiaUrl}/modules/graphql`,
      });
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle URL normalization by removing trailing slash', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080/';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Client).toHaveBeenCalledWith({
        exchanges: [{}],
        fetchOptions: {
          headers: {
            Authorization: `Basic encoded_${jahiaUsername}:${jahiaPassword}`,
            'Content-Type': 'application/json',
            Origin: 'http://localhost:8080', // trailing slash removed
          },
        },
        url: 'http://localhost:8080/modules/graphql',
      });
    });

    it('should handle URL without trailing slash', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Client).toHaveBeenCalledWith({
        exchanges: [{}],
        fetchOptions: {
          headers: {
            Authorization: `Basic encoded_${jahiaUsername}:${jahiaPassword}`,
            'Content-Type': 'application/json',
            Origin: jahiaUrl, // no change needed
          },
        },
        url: `${jahiaUrl}/modules/graphql`,
      });
    });
  });

  describe('authentication failures', () => {
    it('should throw error when GraphQL query returns no data', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: null,
      });

      // Act & Assert
      await expect(
        getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword),
      ).rejects.toThrow(
        'Authentication failed: Unable to authenticate with the provided credentials',
      );
    });

    it('should throw error when currentUser is null', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: null,
        },
      });

      // Act & Assert
      await expect(
        getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword),
      ).rejects.toThrow(
        'Authentication failed: Unable to authenticate with the provided credentials',
      );
    });

    it('should throw error when authenticated username does not match expected username', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'expecteduser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: 'differentuser',
          },
        },
      });

      // Act & Assert
      await expect(
        getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword),
      ).rejects.toThrow(
        'Authentication failed: Authenticated user "differentuser" does not match expected username "expecteduser"',
      );
    });

    it('should throw error when GraphQL query rejects', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword),
      ).rejects.toThrow('Network error');
    });
  });

  describe('GraphQL query construction', () => {
    it('should execute GraphQL query to fetch current user', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String), // The GraphQL query string
        {}, // Empty variables object
      );
    });
  });

  describe('Base64 encoding', () => {
    it('should properly encode credentials for Basic auth', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'user123';
      const jahiaPassword = 'pass456';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      const { Base64 } = require('js-base64');

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Base64.btoa).toHaveBeenCalledWith('user123:pass456');
    });
  });

  describe('edge cases', () => {
    it('should handle empty username', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = '';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: '',
          },
        },
      });

      // Act
      const result = await getGraphqlClient(
        jahiaUrl,
        jahiaUsername,
        jahiaPassword,
      );

      // Assert
      expect(result).toBe(mockClient);
    });

    it('should handle special characters in credentials', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:8080';
      const jahiaUsername = 'user@domain.com';
      const jahiaPassword = 'p@ssw0rd!';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      const { Base64 } = require('js-base64');

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Base64.btoa).toHaveBeenCalledWith('user@domain.com:p@ssw0rd!');
    });

    it('should handle URLs with different ports', async () => {
      // Arrange
      const jahiaUrl = 'http://localhost:3000';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Client).toHaveBeenCalledWith({
        exchanges: [{}],
        fetchOptions: {
          headers: {
            Authorization: `Basic encoded_${jahiaUsername}:${jahiaPassword}`,
            'Content-Type': 'application/json',
            Origin: jahiaUrl,
          },
        },
        url: `${jahiaUrl}/modules/graphql`,
      });
    });

    it('should handle HTTPS URLs', async () => {
      // Arrange
      const jahiaUrl = 'https://example.com';
      const jahiaUsername = 'testuser';
      const jahiaPassword = 'testpass';

      mockQuery.mockResolvedValue({
        data: {
          currentUser: {
            username: jahiaUsername,
          },
        },
      });

      // Act
      await getGraphqlClient(jahiaUrl, jahiaUsername, jahiaPassword);

      // Assert
      expect(Client).toHaveBeenCalledWith({
        exchanges: [{}],
        fetchOptions: {
          headers: {
            Authorization: `Basic encoded_${jahiaUsername}:${jahiaPassword}`,
            'Content-Type': 'application/json',
            Origin: jahiaUrl,
          },
        },
        url: `${jahiaUrl}/modules/graphql`,
      });
    });
  });
});
