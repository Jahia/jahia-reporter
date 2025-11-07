import { Client } from '@urql/core';

import { getPlatform } from '../src/utils/getPlatform.js';

// Mock the @urql/core module
jest.mock('@urql/core', () => ({
  Client: jest.fn(),
}));

// Mock gql.tada
jest.mock('gql.tada', () => ({
  graphql: jest.fn((query: string) => query),
}));

// Mock console.log to verify it's called
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('getPlatform', () => {
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
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
  });

  describe('successful GraphQL response', () => {
    it('should return platform details when query is successful', async () => {
      // Arrange
      const mockPlatformData = {
        cluster: {
          isActivated: true,
        },
        jahia: {
          database: {
            driverName: 'PostgreSQL JDBC Driver',
            driverVersion: '42.3.6',
            name: 'jahia',
            type: 'postgresql',
            version: '13.8',
          },
          system: {
            java: {
              runtimeName: 'OpenJDK Runtime Environment',
              runtimeVersion: '11.0.19+7-Ubuntu-0ubuntu120.04.1',
              vendor: 'Eclipse Adoptium',
              vendorVersion: '11.0.19+7',
            },
            os: {
              architecture: 'amd64',
              name: 'Linux',
              version: '5.4.0-150-generic',
            },
          },
          version: {
            build: '65432',
            buildDate: '2023-10-30T10:00:00Z',
            isSnapshot: false,
            release: '8.2.0.0',
          },
        },
      };

      mockQuery.mockResolvedValue({
        data: {
          admin: mockPlatformData,
        },
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toEqual(mockPlatformData);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String), // GraphQL query
        {}, // Empty variables
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Fetched full details about the platform',
      );
    });

    it('should handle snapshot version correctly', async () => {
      // Arrange
      const mockPlatformData = {
        cluster: {
          isActivated: false,
        },
        jahia: {
          database: {
            driverName: 'MySQL Connector/J',
            driverVersion: '8.0.33',
            name: 'jahia_dev',
            type: 'mysql',
            version: '8.0.34',
          },
          system: {
            java: {
              runtimeName: 'OpenJDK Runtime Environment',
              runtimeVersion: '17.0.8+7-LTS',
              vendor: 'Eclipse Temurin',
              vendorVersion: '17.0.8+7',
            },
            os: {
              architecture: 'arm64',
              name: 'macOS',
              version: '14.0',
            },
          },
          version: {
            build: '65433',
            buildDate: '2023-10-30T15:30:00Z',
            isSnapshot: true,
            release: '8.3.0.0-SNAPSHOT',
          },
        },
      };

      mockQuery.mockResolvedValue({
        data: {
          admin: mockPlatformData,
        },
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toEqual(mockPlatformData);
      expect(result?.jahia.version.isSnapshot).toBe(true);
      expect(result?.cluster.isActivated).toBe(false);
    });

    it('should handle different database types and configurations', async () => {
      // Arrange
      const mockPlatformData = {
        cluster: {
          isActivated: true,
        },
        jahia: {
          database: {
            driverName: 'MariaDB Connector/J',
            driverVersion: '3.1.4',
            name: 'jahia_prod',
            type: 'mariadb',
            version: '10.6.14',
          },
          system: {
            java: {
              runtimeName: 'OpenJDK Runtime Environment',
              runtimeVersion: '11.0.20+8',
              vendor: 'Amazon',
              vendorVersion: '11.0.20+8-LTS',
            },
            os: {
              architecture: 'x86_64',
              name: 'Windows Server 2019',
              version: '10.0.17763',
            },
          },
          version: {
            build: '65434',
            buildDate: '2023-10-30T08:00:00Z',
            isSnapshot: false,
            release: '8.1.8.0',
          },
        },
      };

      mockQuery.mockResolvedValue({
        data: {
          admin: mockPlatformData,
        },
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toEqual(mockPlatformData);
      expect(result?.jahia.database.type).toBe('mariadb');
      expect(result?.jahia.system.os.name).toBe('Windows Server 2019');
    });
  });

  describe('error handling', () => {
    it('should return undefined when GraphQL response data is null', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        data: null,
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should return undefined when GraphQL response has an error', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: { build: '123' },
            },
          },
        },
        error: new Error('GraphQL error'),
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should return undefined when GraphQL response has both data and error', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: { build: '123' },
            },
          },
        },
        error: { message: 'Partial error' },
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toBeUndefined();
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should propagate GraphQL query rejection', async () => {
      // Arrange
      mockQuery.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(getPlatform(mockClient)).rejects.toThrow('Network error');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should handle undefined error property', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        data: {
          admin: {
            cluster: {
              isActivated: false,
            },
            jahia: {
              database: {
                driverName: 'PostgreSQL JDBC Driver',
                driverVersion: '42.6.0',
                name: 'jahia',
                type: 'postgresql',
                version: '14.9',
              },
              system: {
                java: {
                  runtimeName: 'OpenJDK Runtime Environment',
                  runtimeVersion: '17.0.8+7-Ubuntu-122.04',
                  vendor: 'Eclipse Adoptium',
                  vendorVersion: '17.0.8+7',
                },
                os: {
                  architecture: 'amd64',
                  name: 'Ubuntu',
                  version: '22.04.3 LTS',
                },
              },
              version: {
                build: '65435',
                buildDate: '2023-10-30T12:00:00Z',
                isSnapshot: false,
                release: '8.2.1.0',
              },
            },
          },
        },
        // error property is undefined (not explicitly set)
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toBeDefined();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Fetched full details about the platform',
      );
    });
  });

  describe('GraphQL query construction', () => {
    it('should execute GraphQL query with correct structure', async () => {
      // Arrange
      mockQuery.mockResolvedValue({
        data: {
          admin: {
            cluster: { isActivated: true },
            jahia: {
              database: { type: 'postgresql' },
              system: { java: { vendor: 'OpenJDK' }, os: { name: 'Linux' } },
              version: { build: '123' },
            },
          },
        },
        error: undefined,
      });

      // Act
      await getPlatform(mockClient);

      // Assert
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String), // The GraphQL query string
        {}, // Empty variables object
      );
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle minimal platform data', async () => {
      // Arrange
      const mockMinimalData = {
        cluster: {
          isActivated: false,
        },
        jahia: {
          database: {
            driverName: '',
            driverVersion: '',
            name: '',
            type: '',
            version: '',
          },
          system: {
            java: {
              runtimeName: '',
              runtimeVersion: '',
              vendor: '',
              vendorVersion: '',
            },
            os: {
              architecture: '',
              name: '',
              version: '',
            },
          },
          version: {
            build: '',
            buildDate: '',
            isSnapshot: false,
            release: '',
          },
        },
      };

      mockQuery.mockResolvedValue({
        data: {
          admin: mockMinimalData,
        },
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toEqual(mockMinimalData);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Fetched full details about the platform',
      );
    });

    it('should handle very long version strings and special characters', async () => {
      // Arrange
      const mockPlatformData = {
        cluster: {
          isActivated: true,
        },
        jahia: {
          database: {
            driverName: 'PostgreSQL JDBC Driver',
            driverVersion: '42.6.0',
            name: 'jahia_test_database_with_very_long_name',
            type: 'postgresql',
            version: '15.4 (Ubuntu 15.4-2.pgdg22.04+1)',
          },
          system: {
            java: {
              runtimeName:
                'OpenJDK Runtime Environment (build 17.0.8+7-Ubuntu-1ubuntu122.04)',
              runtimeVersion: '17.0.8+7-Ubuntu-1ubuntu122.04',
              vendor: 'Private Build',
              vendorVersion: '17.0.8+7-Ubuntu-1ubuntu122.04',
            },
            os: {
              architecture: 'x86_64',
              name: 'Ubuntu 22.04.3 LTS (Jammy Jellyfish)',
              version:
                '5.15.0-87-generic #97-Ubuntu SMP Mon Oct 2 21:09:21 UTC 2023',
            },
          },
          version: {
            build:
              'very-long-build-number-with-special-characters-123456789-SNAPSHOT-dev-feature-branch',
            buildDate: '2023-10-30T23:59:59.999Z',
            isSnapshot: true,
            release: '8.2.0.0-SNAPSHOT-feature/special-chars-éñ@#$',
          },
        },
      };

      mockQuery.mockResolvedValue({
        data: {
          admin: mockPlatformData,
        },
        error: undefined,
      });

      // Act
      const result = await getPlatform(mockClient);

      // Assert
      expect(result).toEqual(mockPlatformData);
      expect(result?.jahia.version.release).toContain('special-chars-éñ@#$');
    });
  });
});
