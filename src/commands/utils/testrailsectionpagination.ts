import { Command, Flags } from '@oclif/core';

import { TestRailClient } from '../../utils/testrail.js';

class TestrailSectionsPagination extends Command {
  static description = 'Try out testrail pagination for sections';

  static flags = {
    help: Flags.help({ char: 'h' }),
    testrailApiKey: Flags.string({
      description: 'TestRail to be used as an alternative to username/password',
      required: false,
    }),
    testrailPassword: Flags.string({
      description: 'TestRail password',
      required: true,
    }),
    testrailProjectId: Flags.integer({
      description: 'TestRail Project ID',
      required: true,
    }),
    testrailSuiteId: Flags.integer({
      description: 'TestRail Suite ID within the project',
      required: true,
    }),
    testrailUrl: Flags.string({
      default: 'https://jahia.testrail.net',
      description: 'TestRail url to submit the results from the report to',
    }),
    testrailUsername: Flags.string({
      description: 'TestRail username',
      required: true,
    }),
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(TestrailSectionsPagination);

    const testrail = new TestRailClient(
      flags.testrailUrl,
      flags.testrailUsername,
      flags.testrailApiKey === undefined
        ? flags.testrailPassword
        : flags.testrailApiKey,
    );

    const allSectionsInTestrail = testrail.getSections(
      flags.testrailProjectId,
      flags.testrailSuiteId,
    );

    // for (const section of allSectionsInTestrail) {
    //   console.log(section);
    // }
    this.log(`Total sections count: ${allSectionsInTestrail.length}`);
  }
}

export default TestrailSectionsPagination;
