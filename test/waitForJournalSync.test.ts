import type { Client } from '@urql/core';

import { waitForJournalSync } from '../src/utils/waitForJournalSync.js';

// Mock the sleep function
jest.mock('../src/utils/sleep.js', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

// Mock gql.tada
jest.mock('gql.tada', () => ({
  graphql: jest.fn((query: string) => query),
}));

// Import the mocked sleep function
import { sleep } from '../src/utils/sleep.js';

const mockSleep = sleep as jest.MockedFunction<typeof sleep>;

// Helper to create mock client
const createMockClient = (queryResponses: Array<{ data: unknown }>) => {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() => {
      const response =
        queryResponses[callIndex] ?? queryResponses[queryResponses.length - 1];
      callIndex++;
      return Promise.resolve(response);
    }),
  } as unknown as Client;
};

describe('waitForJournalSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSleep.mockResolvedValue(undefined);
  });

  describe('basic function behavior', () => {
    it('should exit immediately when response.data is null', async () => {
      const mockClient = createMockClient([{ data: null }]);

      await waitForJournalSync(5, mockClient);

      // Should exit on first iteration due to null data
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should call client.query with GraphQL query and empty variables', async () => {
      const mockClient = createMockClient([{ data: null }]);

      await waitForJournalSync(1, mockClient);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String), // GraphQL query
        {}, // Empty variables
      );
    });

    it('should loop through all iterations when cluster is activated but not in sync', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 95, serverId: 'server1' },
                  revisions: [],
                  isClusterSync: false,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(3, mockClient);

      // Should loop through all iterations since not in sync
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledWith(1000);
    });
  });

  describe('timeout parameter', () => {
    it('should handle timeout of 0 (no iterations)', async () => {
      const mockClient = createMockClient([{ data: null }]);

      await waitForJournalSync(0, mockClient);

      // With timeout 0, loop never executes
      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should handle timeout of 1 (single iteration) with early exit', async () => {
      const mockClient = createMockClient([{ data: null }]);

      await waitForJournalSync(1, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      // No sleep when exiting early
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should handle larger timeout values when not synced', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  isClusterSync: false,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockSleep).toHaveBeenCalledTimes(5);
    });
  });

  describe('early exit conditions', () => {
    it('should exit early when response.data is null', async () => {
      const mockClient = createMockClient([{ data: null }]);

      await waitForJournalSync(5, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should exit early when isActivated is false', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: false,
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 100, serverId: 'server1' },
                  revisions: [],
                  isClusterSync: false,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // Should exit on first iteration due to isActivated: false
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should exit early when isActivated is undefined', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 100, serverId: 'server1' },
                  revisions: [],
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // Should exit on first iteration due to isActivated: undefined
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should exit early when cluster is activated and in sync', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 100, serverId: 'server1' },
                  revisions: [{ revision: 100, serverId: 'server1' }],
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // Should exit on first iteration due to sync condition
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should continue looping when cluster is activated but not in sync', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 95, serverId: 'server1' },
                  revisions: [],
                  isClusterSync: false,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(3, mockClient);

      // Should loop through all iterations since not in sync
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledTimes(3);
    });
  });

  describe('sync status transitions', () => {
    it('should exit when sync becomes true on second iteration', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: { isClusterSync: false },
              },
            },
          },
        },
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: { isClusterSync: true },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // First iteration: not synced, sleep
      // Second iteration: synced, exit
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
    });

    it('should exit when cluster becomes deactivated', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: { isClusterSync: false },
              },
            },
          },
        },
        {
          data: {
            admin: {
              cluster: {
                isActivated: false,
                journal: { isClusterSync: false },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // First iteration: activated but not synced, sleep
      // Second iteration: deactivated, exit
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockSleep).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases for data structure', () => {
    it('should exit early when admin is missing in response data', async () => {
      const mockClient = createMockClient([
        {
          data: {
            // admin is missing
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // isActivated is undefined, so should exit early
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should exit early when cluster is missing in response data', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              // cluster is missing
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // isActivated is undefined, so should exit early
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should continue looping when journal is missing but cluster is activated', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                // journal is missing
              },
            },
          },
        },
      ]);

      await waitForJournalSync(3, mockClient);

      // isActivated is true but isClusterSync is undefined, so continues
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledTimes(3);
    });
  });

  describe('complete journal data variations', () => {
    it('should handle complete journal data structure when synced', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 12345,
                  localRevision: {
                    revision: 12345,
                    serverId: 'node-001',
                  },
                  revisions: [
                    { revision: 12345, serverId: 'node-001' },
                    { revision: 12345, serverId: 'node-002' },
                    { revision: 12345, serverId: 'node-003' },
                  ],
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // Should exit on first iteration due to sync condition
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should handle empty revisions array when synced', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 100,
                  localRevision: { revision: 100, serverId: 'server1' },
                  revisions: [],
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });

    it('should handle null localRevision when synced', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  globalRevision: 100,
                  localRevision: null,
                  revisions: [],
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockSleep).not.toHaveBeenCalled();
    });
  });

  describe('sleep function behavior', () => {
    it('should call sleep with 1000ms between iterations when not synced', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  isClusterSync: false,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(3, mockClient);

      expect(mockSleep).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenNthCalledWith(1, 1000);
      expect(mockSleep).toHaveBeenNthCalledWith(2, 1000);
      expect(mockSleep).toHaveBeenNthCalledWith(3, 1000);
    });

    it('should not call sleep when exiting early', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: {
                  isClusterSync: true,
                },
              },
            },
          },
        },
      ]);

      await waitForJournalSync(5, mockClient);

      // Should exit before sleep
      expect(mockSleep).not.toHaveBeenCalled();
    });
  });

  describe('async behavior', () => {
    it('should return a Promise', () => {
      const mockClient = createMockClient([{ data: null }]);

      const result = waitForJournalSync(1, mockClient);

      expect(result).toBeInstanceOf(Promise);
    });

    it('should await client.query properly', async () => {
      let queryResolved = false;
      const mockClient = {
        query: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => {
                queryResolved = true;
                resolve({ data: null });
              }, 10);
            }),
        ),
      } as unknown as Client;

      await waitForJournalSync(1, mockClient);

      expect(queryResolved).toBe(true);
    });

    it('should await sleep properly', async () => {
      let sleepResolved = false;
      mockSleep.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              sleepResolved = true;
              resolve();
            }, 10);
          }),
      );

      const mockClient = createMockClient([
        {
          data: {
            admin: {
              cluster: {
                isActivated: true,
                journal: { isClusterSync: false },
              },
            },
          },
        },
        { data: null }, // Exit on second iteration
      ]);

      await waitForJournalSync(2, mockClient);

      expect(sleepResolved).toBe(true);
    });
  });
});
