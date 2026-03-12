import { Command, Flags } from '@oclif/core';

import { getGraphqlClient } from '../../utils/getGraphqlClient.js';
import { waitUntilSAMStatus } from '../../utils/waitUntilSamStatus.js';

class JahiaSam extends Command {
  static description = 'Wait until SAM returns GREEN for the provided severity';
static flags = {
    greenMatchCount: Flags.integer({
      default: 10,
      description: 'Number of consecutive GREEN statuses to match',
    }),
    help: Flags.help({ char: 'h' }),
    interval: Flags.integer({
      default: 2,
      description: 'Interval, in seconds, between status checks',
    }),
    jahiaPassword: Flags.string({
      default: 'root',
      description:
        'Jahia password used to authenticated with the remote endpoint)',
    }),
    jahiaUrl: Flags.string({
      default: 'http://localhost:8080/',
      description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/)',
    }),
    jahiaUsername: Flags.string({
      default: 'root',
      description:
        'Jahia username used to authenticated with the remote endpoint)',
    }),
    severity: Flags.string({
      default: 'MEDIUM',
      description: 'What severity to wait for (LOW, MEDIUM, HIGH, CRITICAL)',
    }),
    timeout: Flags.integer({
      default: 120,
      description: 'Timeout, in seconds, for waiting for SAM status',
    }),
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaSam);

    try {
      const client = await getGraphqlClient(
        flags.jahiaUrl,
        flags.jahiaUsername,
        flags.jahiaPassword,
        true,
      );

      this.log(
        `Waiting for SAM status GREEN with severity ${flags.severity} (timeout: ${flags.timeout}s)`,
      );

      const healthCheckPayload = await waitUntilSAMStatus({
        client,
        expectedHealth: 'GREEN',
        interval: flags.interval, // Keep as seconds, function will convert
        probeHealthFilter: 'YELLOW',
        severity: flags.severity,
        statusMatchCount: flags.greenMatchCount,
        timeout: flags.timeout * 1000, // Convert seconds to milliseconds
      });

      this.log('SAM status GREEN achieved successfully');

      // Log final health check payload for debugging
      this.log(
        'Final health check payload:',
        JSON.stringify(healthCheckPayload, null, 2),
      );
    } catch (error) {
      this.log('SAM failed to reach GREEN status, error is:');
      this.log(error instanceof Error ? error.message : String(error));
      this.exit(1);
    }
  }
}

export default JahiaSam;
