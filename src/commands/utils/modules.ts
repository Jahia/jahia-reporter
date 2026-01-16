import { Command, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { UtilsPlatform, UtilsVersions } from '../../types/index.js';
import { getGraphqlClient } from '../../utils/getGraphqlClient.js';
import { getModules } from '../../utils/getModules.js';
import { getPlatform } from '../../utils/getPlatform.js';
import { waitForJournalSync } from '../../utils/waitForJournalSync.js';

class JahiaUtilsModule extends Command {
  static description =
    'For a provided module, returns the module version, Jahia version and list of installed modules';

  static flags = {
    dependencies: Flags.string({
      default: '',
      description: 'Comma separated list of module ID dependencies',
    }),
    filepath: Flags.string({
      description: 'Filepath to store the resulting JSON to',
      required: true,
    }),
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
    moduleId: Flags.string({
      description: 'Module ID of the module currently being tested',
      required: true,
    }),
    timeout: Flags.integer({
      default: 120,
      description: 'Timeout for journal sync',
    }),
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaUtilsModule);

    const dependencies: string[] = flags.dependencies.split(',');

    const jahiaFullUrl =
      flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/';

    const client = await getGraphqlClient(
      flags.jahiaUrl,
      flags.jahiaUsername,
      flags.jahiaPassword,
    );

    console.log(`Waiting for Jahia journal to be in-sync at: ${jahiaFullUrl}`);
    await waitForJournalSync(flags.timeout, client);
    console.log('Done waiting for journal sync');
    const version: UtilsVersions = await getModules(
      flags.moduleId,
      dependencies,
      client,
    );

    const platform: UtilsPlatform | undefined = await getPlatform(client);

    fs.writeFileSync(
      path.join(flags.filepath),
      JSON.stringify({ ...version, platform }, null, 2),
    );
  }
}

export default JahiaUtilsModule;
