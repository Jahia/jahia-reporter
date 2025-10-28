import { Command, Flags } from '@oclif/core';

import waitAlive from '../../utils/waitAlive.js';

class JahiaUtilsAlive extends Command {
  static description =
    'Indefinitely waits until a Jahia instance becomes available';

  static flags = {
    help: Flags.help({ char: 'h' }),
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
    timeout: Flags.string({
      char: 't',
      description:
        'Specify a timeout after which the process will exit with an error',
      required: false,
    }),
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaUtilsAlive);

    let timeout =
      flags.timeout === undefined
        ? 0
        : Math.round(Number.parseInt(flags.timeout, 10) * 1000);
    if (timeout === 0) {
      timeout = 300_000; // By default timeout, if specified, is a minimum of 300 seconds (5 minutes)
    }

    const jahiaFullUrl =
      flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/';

    await waitAlive(
      jahiaFullUrl,
      flags.jahiaUsername,
      flags.jahiaPassword,
      timeout,
    );
  }
}

export default JahiaUtilsAlive;
