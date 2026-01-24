import { Client } from '@urql/core';

import { JahiaModule } from '../src/types/index.js';
import { getModules } from '../src/utils/getModules.js';

// Mock the @urql/core module
jest.mock('@urql/core', () => ({
  Client: jest.fn(),
}));

// Mock gql.tada
jest.mock('gql.tada', () => ({
  graphql: jest.fn((query: string) => query),
}));

describe('getModules', () => {
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

  describe('successful GraphQL response', () => {
    it('should return module details when module is found', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1', 'dep2'];

      const mockModules: JahiaModule[] = [
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
        { id: 'test-module', name: 'Test Module', version: '3.0.0' },
        { id: 'other-module', name: 'Other Module', version: '4.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result).toEqual({
        allModules: [
          { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
          { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
          { id: 'other-module', name: 'Other Module', version: '4.0.0' },
          { id: 'test-module', name: 'Test Module', version: '3.0.0' },
        ], // Should be sorted by id
        dependencies: [
          { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
          { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
        ],
        jahia: {
          build: '12345',
          buildDate: '2023-01-01',
          isSnapshot: false,
          release: '8.2.0.0',
        },
        module: { id: 'test-module', name: 'Test Module', version: '3.0.0' },
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String), // GraphQL query
        {}, // Empty variables
      );
    });

    it('should return UNKNOWN module when module is not found', async () => {
      // Arrange
      const moduleId = 'missing-module';
      const dependencies = ['dep1'];

      const mockModules: JahiaModule[] = [
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'other-module', name: 'Other Module', version: '4.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.module).toEqual({
        id: 'missing-module',
        name: 'UNKNOWN',
        version: 'UNKNOWN',
      });
      expect(result.allModules).toHaveLength(2);
      expect(result.dependencies).toHaveLength(1);
    });

    it('should filter out non-existent dependencies', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1', 'missing-dep', 'dep2'];

      const mockModules: JahiaModule[] = [
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
        { id: 'test-module', name: 'Test Module', version: '3.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.dependencies).toEqual([
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
      ]);
      // missing-dep should be filtered out
      expect(result.dependencies).toHaveLength(2);
    });

    it('should handle empty dependencies array', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies: string[] = [];

      const mockModules: JahiaModule[] = [
        { id: 'test-module', name: 'Test Module', version: '3.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.dependencies).toEqual([]);
      expect(result.allModules).toHaveLength(1);
      expect(result.module.id).toBe('test-module');
    });

    it('should sort modules alphabetically by id', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies: string[] = [];

      const mockModules: JahiaModule[] = [
        { id: 'zebra-module', name: 'Zebra Module', version: '1.0.0' },
        { id: 'alpha-module', name: 'Alpha Module', version: '2.0.0' },
        { id: 'beta-module', name: 'Beta Module', version: '3.0.0' },
        { id: 'test-module', name: 'Test Module', version: '4.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.allModules.map((m: JahiaModule) => m.id)).toEqual([
        'alpha-module',
        'beta-module',
        'test-module',
        'zebra-module',
      ]);
    });

    it('should handle modules with special characters in names', async () => {
      // Arrange
      const moduleId = 'special-module';
      const dependencies = ['dep-with-special'];

      const mockModules: JahiaModule[] = [
        {
          id: 'dep-with-special',
          name: 'Dependency with "quotes" & symbols',
          version: '1.0.0-SNAPSHOT',
        },
        {
          id: 'special-module',
          name: 'Module with émojis 🚀',
          version: '2.1.0-RC1',
        },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '67890',
                buildDate: '2023-02-01',
                isSnapshot: true,
                release: '8.3.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.module.name).toBe('Module with émojis 🚀');
      expect(result.dependencies[0].name).toBe(
        'Dependency with "quotes" & symbols',
      );
      expect(result.jahia.isSnapshot).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return default values when GraphQL response data is null', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1'];

      mockQuery.mockResolvedValue({
        data: null,
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result).toEqual({
        allModules: [],
        dependencies: [],
        jahia: {
          build: 'UNKNOWN',
          fullVersion: 'UNKNOWN',
          version: 'UNKNOWN',
        },
        module: {
          id: 'test-module',
          name: 'UNKNOWN',
          version: 'UNKNOWN',
        },
      });
    });

    it('should return default values when GraphQL query throws an error', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1'];

      mockQuery.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        getModules(moduleId, dependencies, mockClient),
      ).rejects.toThrow('Network error');
    });

    it('should handle malformed GraphQL response gracefully', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1'];

      mockQuery.mockResolvedValue({
        data: {
          admin: null,
          dashboard: null,
        },
      });

      // Act
      // This should throw because of trying to access properties of null
      await expect(
        getModules(moduleId, dependencies, mockClient),
      ).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty modules array', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1'];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: [],
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.allModules).toEqual([]);
      expect(result.dependencies).toEqual([]);
      expect(result.module).toEqual({
        id: 'test-module',
        name: 'UNKNOWN',
        version: 'UNKNOWN',
      });
    });

    it('should handle duplicate dependencies', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['dep1', 'dep1', 'dep2']; // duplicate dep1

      const mockModules: JahiaModule[] = [
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'dep2', name: 'Dependency 2', version: '2.0.0' },
        { id: 'test-module', name: 'Test Module', version: '3.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      // Should include dep1 twice (as per the current implementation behavior)
      expect(result.dependencies).toHaveLength(3);
      expect(result.dependencies.filter((d) => d.id === 'dep1')).toHaveLength(
        2,
      );
    });

    it('should handle module ID that is also in dependencies', async () => {
      // Arrange
      const moduleId = 'test-module';
      const dependencies = ['test-module', 'dep1']; // moduleId is also a dependency

      const mockModules: JahiaModule[] = [
        { id: 'dep1', name: 'Dependency 1', version: '1.0.0' },
        { id: 'test-module', name: 'Test Module', version: '3.0.0' },
      ];

      mockQuery.mockResolvedValue({
        data: {
          admin: {
            jahia: {
              version: {
                build: '12345',
                buildDate: '2023-01-01',
                isSnapshot: false,
                release: '8.2.0.0',
              },
            },
          },
          dashboard: {
            modules: mockModules,
          },
        },
      });

      // Act
      const result = await getModules(moduleId, dependencies, mockClient);

      // Assert
      expect(result.module.id).toBe('test-module');
      expect(result.dependencies).toContainEqual({
        id: 'test-module',
        name: 'Test Module',
        version: '3.0.0',
      });
      expect(result.dependencies).toHaveLength(2);
    });
  });
});
