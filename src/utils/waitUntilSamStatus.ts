// This is a re-implementation of the logic present in jahia-cypress
// https://github.com/Jahia/jahia-cypress/blob/main/src/utils/SAMHelper.ts

import { performance } from 'node:perf_hooks';

import { Client } from '@urql/core';
import { graphql } from 'gql.tada';

/**
 * Simple health check query
 * @param severity the severity of the health check, default is MEDIUM
 * @param probeHealthFilter return only probes with health status matching or above, default is null
 * @param probeNamesFilter return and calculate health status only for the probes with the given names, default is null
 */

const healthCheck = async ({
  client,
  severity = 'MEDIUM',
  probeHealthFilter = null,
  probeNamesFilter = null,
}: {
  client: Client;
  severity?: string;
  probeHealthFilter?: string | null;
  probeNamesFilter?: string[] | null;
}) => {
  const response = await client.query(
    graphql(`
      query (
        $severity: GqlProbeSeverity
        $probeHealthFilter: GqlProbeHealth
        $probeNamesFilter: [String!]
      ) {
        admin {
          jahia {
            healthCheck(severity: $severity, includes: $probeNamesFilter) {
              status {
                health
                message
              }
              probes(health: $probeHealthFilter) {
                name
                severity
                description
                status {
                  health
                  message
                }
              }
            }
          }
        }
      }
    `),
    { severity, probeHealthFilter, probeNamesFilter },
  );

  return response?.data?.admin?.jahia?.healthCheck;
};

/**
 * Wait until the health check returns the expected health
 * @param expectedHealth the expected health status
 * @param severity the severity of the health check, default is MEDIUM
 * @param probeHealthFilter return only probes with health status matching or above, default is null
 * @param probeNamesFilter return and calculate health status only for the probes with the given names, default is null
 * @param timeout the timeout in milliseconds, default is 60000
 * @param interval the interval in seconds, default is 500
 * @param statusMatchCount the number of consecutive status matches before the waitUntil resolves, default is 3
 * @returns Promise that resolves with health check payload when expected health is reached or rejects with error containing payload on timeout
 */
export const waitUntilSAMStatus = async ({
  client,
  expectedHealth,
  severity = 'MEDIUM',
  probeHealthFilter = null,
  probeNamesFilter = null,
  timeout = 60000,
  interval = 500,
  statusMatchCount = 3,
}: {
  client: Client;
  expectedHealth: string;
  severity?: string;
  probeHealthFilter?: any;
  probeNamesFilter?: string[] | null;
  timeout?: number;
  interval?: number;
  statusMatchCount?: number;
}): Promise<any> => {
  const startTime = performance.now();
  let statusCount = 0;
  let lastGraphqlResponse = {};

  // Convert interval from seconds to milliseconds
  const intervalMs = interval * 1000;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      const elapsed = performance.now() - startTime;

      if (elapsed >= timeout) {
        const error = new Error(
          `Timeout after ${timeout}ms waiting for SAM to be ${expectedHealth} for severity: ${severity} and probeHealthFilter: ${probeHealthFilter}. Last GraphQL response: ${JSON.stringify(
            lastGraphqlResponse,
          )}`,
        );
        (error as any).healthCheckPayload = lastGraphqlResponse;
        reject(error);
        return;
      }

      try {
        const result = await healthCheck({
          client,
          severity,
          probeHealthFilter,
          probeNamesFilter,
        });

        lastGraphqlResponse = result;
        const healthStatus = result?.status;

        if (healthStatus) {
          if (healthStatus.health === expectedHealth) {
            statusCount++;
            console.log(
              `[${new Date().toISOString()}] Status match ${statusCount}/${statusMatchCount}: ${
                healthStatus.health
              } (elapsed: ${Math.round(
                elapsed / 1000,
              )}ms -- timeout: ${Math.round(timeout / 1000)}s)`,
            );

            if (statusCount >= statusMatchCount) {
              console.log(
                `[${new Date().toISOString()}] [Success] SAM status ${expectedHealth} reached after ${Math.round(
                  elapsed / 1000,
                )}s`,
              );
              resolve(lastGraphqlResponse);
              return;
            }
          } else {
            if (statusCount > 0) {
              console.log(
                `[${new Date().toISOString()}] Status changed from ${expectedHealth} to ${
                  healthStatus.health
                }, resetting count (elapsed: ${Math.round(
                  elapsed / 1000,
                )}s -- timeout: ${Math.round(timeout / 1000)}s)`,
              );
            } else {
              console.log(
                `[${new Date().toISOString()}] Status: ${
                  healthStatus.health
                } (elapsed: ${Math.round(
                  elapsed / 1000,
                )}s -- timeout: ${Math.round(timeout / 1000)}s)`,
              );
            }
            statusCount = 0;
          }
        } else {
          console.log(
            `[${new Date().toISOString()}] No health status in response (elapsed: ${Math.round(
              elapsed / 1000,
            )}s -- timeout: ${Math.round(timeout / 1000)}s)`,
          );
          statusCount = 0;
        }
      } catch (error) {
        // Be robust - don't fail on individual errors, just log and continue
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(
          `[${new Date().toISOString()}] Error during health check: ${errorMessage} (elapsed: ${Math.round(
            elapsed / 1000,
          )}s -- timeout: ${Math.round(timeout / 1000)}s)`,
        );
        statusCount = 0;
        lastGraphqlResponse = { error: errorMessage };
      }

      // Schedule next poll using the interval in milliseconds
      setTimeout(poll, intervalMs);
    };

    // Start polling
    poll();
  });
};
