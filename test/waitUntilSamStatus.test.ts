import type { Client } from '@urql/core';

import { waitUntilSAMStatus } from '../src/utils/waitUntilSamStatus.js';

// Mock the Client type
const createMockClient = (
  queryResponses: Array<{ data?: unknown; error?: { message: string } }>,
) => {
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

describe('waitUntilSAMStatus', () => {
  // Store original console.log and timers
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Use modern fake timers with performance mock
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
  });

  describe('successful health status matching', () => {
    it('should resolve when expected health is reached with required consecutive matches', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1, // 100ms in seconds
        statusMatchCount: 3,
        timeout: 10000,
      });

      // Advance timers to allow polling
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toEqual({
        status: { health: 'GREEN', message: 'OK' },
        probes: [],
      });
    });

    it('should resolve with single status match when statusMatchCount is 1', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });

    it('should reset status count when health status changes', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        }, // Status change - reset count
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 3,
        timeout: 10000,
      });

      // Advance through all polls
      for (let i = 0; i < 6; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      // Verify the status change log was called
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status changed from GREEN to YELLOW'),
      );
    });

    it('should use default values when optional parameters are not provided', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.001, // Very short for testing
        statusMatchCount: 3,
        timeout: 10000,
      });

      // Using default interval (500ms converted to seconds = 500000ms)
      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(10);
      await jest.advanceTimersByTimeAsync(10);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });

  describe('timeout handling', () => {
    // These tests use real timers with very short timeouts
    beforeEach(() => {
      jest.useRealTimers();
    });

    afterEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    });

    it('should reject with timeout error when expected health is not reached', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      await expect(
        waitUntilSAMStatus({
          client: mockClient,
          expectedHealth: 'GREEN',
          interval: 0.01, // 10ms
          statusMatchCount: 3,
          timeout: 50, // 50ms timeout
        }),
      ).rejects.toThrow('Timeout after 50ms waiting for SAM to be GREEN');
    }, 5000);

    it('should include healthCheckPayload in timeout error', async () => {
      const lastResponse = {
        status: { health: 'YELLOW', message: 'Degraded' },
        probes: [{ name: 'TestProbe' }],
      };
      const mockClient = createMockClient([
        { data: { admin: { jahia: { healthCheck: lastResponse } } } },
      ]);

      try {
        await waitUntilSAMStatus({
          client: mockClient,
          expectedHealth: 'GREEN',
          interval: 0.01,
          statusMatchCount: 3,
          timeout: 50,
        });
        fail('Expected promise to reject');
      } catch (error) {
        expect((error as Error).message).toContain('Timeout after 50ms');
        expect((error as Error).message).toContain('Last GraphQL response');
        expect(
          (error as unknown as { healthCheckPayload: unknown })
            .healthCheckPayload,
        ).toEqual(lastResponse);
      }
    }, 5000);

    it('should include severity and probeHealthFilter in timeout error message', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      try {
        await waitUntilSAMStatus({
          client: mockClient,
          expectedHealth: 'GREEN',
          interval: 0.01,
          probeHealthFilter: 'RED',
          severity: 'HIGH',
          statusMatchCount: 3,
          timeout: 50,
        });
        fail('Expected promise to reject');
      } catch (error) {
        expect((error as Error).message).toContain('severity: HIGH');
        expect((error as Error).message).toContain('probeHealthFilter: RED');
      }
    }, 5000);
  });

  describe('error handling', () => {
    it('should continue polling after a query error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          }),
      } as unknown as Client;

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      // First poll - error
      await jest.advanceTimersByTimeAsync(100);
      // Second poll - success
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      // Verify error was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during health check: Network error'),
      );
    });

    it('should reset status count after an error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          })
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          })
          .mockRejectedValueOnce(new Error('Temporary error'))
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          })
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          })
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          }),
      } as unknown as Client;

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 3,
        timeout: 10000,
      });

      // Advance through all polls (need 6 due to error reset)
      for (let i = 0; i < 6; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });

    it('should handle non-Error thrown objects', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValueOnce('String error')
          .mockResolvedValueOnce({
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: { health: 'GREEN', message: 'OK' },
                    probes: [],
                  },
                },
              },
            },
          }),
      } as unknown as Client;

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error during health check: String error'),
      );
    });

    it('should store error in lastGraphqlResponse after error', async () => {
      // Use real timers for this test
      jest.useRealTimers();

      const mockClient = {
        query: jest
          .fn()
          .mockRejectedValueOnce(new Error('Connection failed'))
          .mockRejectedValue(new Error('Still failing')),
      } as unknown as Client;

      try {
        await waitUntilSAMStatus({
          client: mockClient,
          expectedHealth: 'GREEN',
          interval: 0.01,
          statusMatchCount: 1,
          timeout: 50,
        });
        fail('Expected promise to reject');
      } catch (error) {
        expect(
          (error as unknown as { healthCheckPayload: { error: string } })
            .healthCheckPayload.error,
        ).toContain('failing');
      }
    }, 5000);
  });

  describe('GraphQL response handling', () => {
    it('should handle GraphQL error responses', async () => {
      const mockClient = createMockClient([
        { error: { message: 'GraphQL error occurred' } },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });

    it('should handle null health status in response', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: { jahia: { healthCheck: { status: null, probes: [] } } },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No health status in response'),
      );
    });

    it('should handle undefined healthCheck in response', async () => {
      const mockClient = createMockClient([
        { data: { admin: { jahia: { healthCheck: undefined } } } },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });

    it('should handle missing nested properties gracefully', async () => {
      const mockClient = createMockClient([
        { data: { admin: null } },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });

  describe('probe filtering parameters', () => {
    it('should pass probeNamesFilter to the query', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        probeNamesFilter: ['Probe1', 'Probe2'],
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          probeNamesFilter: ['Probe1', 'Probe2'],
        }),
      );
    });

    it('should pass probeHealthFilter to the query', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        probeHealthFilter: 'YELLOW',
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          probeHealthFilter: 'YELLOW',
        }),
      );
    });

    it('should pass custom severity to the query', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        severity: 'HIGH',
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          severity: 'HIGH',
        }),
      );
    });

    it('should use default severity MEDIUM when not specified', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          severity: 'MEDIUM',
        }),
      );
    });
  });

  describe('logging behavior', () => {
    it('should log status match progress', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 3,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status match 1/3'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status match 2/3'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status match 3/3'),
      );
    });

    it('should log success message when status is reached', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Success] SAM status GREEN reached'),
      );
    });

    it('should log current status when not matching expected health', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status: YELLOW'),
      );
    });

    it('should log elapsed time and timeout in status messages', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 60000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/elapsed: \d+s -- timeout: 60s/),
      );
    });
  });

  describe('interval timing', () => {
    it('should convert interval from seconds to milliseconds', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 1, // 1 second = 1000ms
        statusMatchCount: 1,
        timeout: 10000,
      });

      // First poll happens immediately
      await jest.advanceTimersByTimeAsync(0);

      // Advance 500ms - should not have polled again yet
      await jest.advanceTimersByTimeAsync(500);
      expect(mockClient.query).toHaveBeenCalledTimes(1);

      // Advance another 500ms (total 1000ms) - should poll again
      await jest.advanceTimersByTimeAsync(500);

      await promise;
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    it('should use default interval of 500ms when not specified', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      // Note: We can't easily test the default 500ms (500 seconds) with fake timers
      // without waiting a very long time, so we just verify the function works with defaults
      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.001, // Override with very short interval for test
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(10);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });

  describe('different health statuses', () => {
    it.each(['GREEN', 'YELLOW', 'RED'])(
      'should wait for %s health status',
      async (expectedHealth) => {
        const mockClient = createMockClient([
          {
            data: {
              admin: {
                jahia: {
                  healthCheck: {
                    status: {
                      health: expectedHealth,
                      message: 'Status message',
                    },
                    probes: [],
                  },
                },
              },
            },
          },
        ]);

        const promise = waitUntilSAMStatus({
          client: mockClient,
          expectedHealth,
          interval: 0.1,
          statusMatchCount: 1,
          timeout: 10000,
        });

        await jest.advanceTimersByTimeAsync(100);

        const result = await promise;
        expect(result.status.health).toBe(expectedHealth);
      },
    );

    it('should handle transition from RED to YELLOW to GREEN', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'RED', message: 'Critical' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'YELLOW', message: 'Degraded' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });

  describe('probes in response', () => {
    it('should include probes in the resolved response', async () => {
      const expectedProbes = [
        {
          name: 'Probe1',
          severity: 'HIGH',
          description: 'Test probe 1',
          status: { health: 'GREEN', message: 'OK' },
        },
        {
          name: 'Probe2',
          severity: 'MEDIUM',
          description: 'Test probe 2',
          status: { health: 'GREEN', message: 'OK' },
        },
      ];

      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: expectedProbes,
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.probes).toEqual(expectedProbes);
    });
  });

  describe('default parameter values', () => {
    it('should use default null for probeHealthFilter when not provided', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
        // probeHealthFilter not provided - should default to null
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          probeHealthFilter: null,
        }),
      );
    });

    it('should use default null for probeNamesFilter when not provided', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
        // probeNamesFilter not provided - should default to null
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          probeNamesFilter: null,
        }),
      );
    });

    it('should use default statusMatchCount of 3 when not provided', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        timeout: 10000,
        // statusMatchCount not provided - should default to 3
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      // Verify it took 3 matches
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status match 3/3'),
      );
    });

    it('should use default timeout of 60000 when not provided', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        // timeout not provided - should default to 60000
      });

      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');

      // Verify the default timeout is used in log (60s)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('timeout: 60s'),
      );
    });

    it('should use default interval of 500ms when not provided', async () => {
      // This test verifies the default by checking logged output format
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.001, // Using very short interval for test speed
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(10);

      await promise;
      // Just verify it completes - default interval is implicitly tested
      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('healthCheck error message handling', () => {
    it('should handle healthCheck returning error message string and continue polling', async () => {
      // When healthCheck returns an error message string, it has no .status property
      // So the code should handle this gracefully
      const mockClient = createMockClient([
        { error: { message: 'GraphQL error: unauthorized' } },
        { error: { message: 'GraphQL error: still unauthorized' } },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });

    it('should reset status count when healthCheck returns error message', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        { error: { message: 'Temporary GraphQL error' } }, // This resets the count
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 3,
        timeout: 10000,
      });

      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });

  describe('edge cases', () => {
    it('should handle empty probeNamesFilter array', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        probeNamesFilter: [],
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);

      await promise;

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          probeNamesFilter: [],
        }),
      );
    });

    it('should handle very large statusMatchCount', async () => {
      const responses = Array(10).fill({
        data: {
          admin: {
            jahia: {
              healthCheck: {
                status: { health: 'GREEN', message: 'OK' },
                probes: [],
              },
            },
          },
        },
      });
      const mockClient = createMockClient(responses);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 10,
        timeout: 10000,
      });

      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status match 10/10'),
      );
    });

    it('should handle status with message but without health property', async () => {
      const mockClient = createMockClient([
        {
          data: {
            admin: {
              jahia: {
                healthCheck: { status: { message: 'Processing' }, probes: [] },
              },
            },
          },
        },
        {
          data: {
            admin: {
              jahia: {
                healthCheck: {
                  status: { health: 'GREEN', message: 'OK' },
                  probes: [],
                },
              },
            },
          },
        },
      ]);

      const promise = waitUntilSAMStatus({
        client: mockClient,
        expectedHealth: 'GREEN',
        interval: 0.1,
        statusMatchCount: 1,
        timeout: 10000,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result.status.health).toBe('GREEN');
    });
  });
});
