import { Command, flags } from '@oclif/command';

import { TestRailClient } from '../../utils/testrail';

class TestrailSectionsPagination extends Command {
  static description = 'Try out testrail pagination for sections';

  static flags = {
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    testrailUrl: flags.string({
      description: 'TestRail url to submit the results from the report to',
      default: 'https://jahia.testrail.net',
    }),
    testrailApiKey: flags.string({
      description: 'TestRail to be used as an alternative to username/password',
      required: false,
    }),
    testrailUsername: flags.string({
      description: 'TestRail username',
      required: true,
    }),
    testrailPassword: flags.string({
      description: 'TestRail password',
      required: true,
    }),
    testrailProjectId: flags.integer({
      description: 'TestRail Project ID',
      required: true,
    }),
    testrailSuiteId: flags.integer({
      description: 'TestRail Suite ID within the project',
      required: true,
    }),
  };

  async run() {
    const { flags } = this.parse(TestrailSectionsPagination);

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

export = TestrailSectionsPagination;
