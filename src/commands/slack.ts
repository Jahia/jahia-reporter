/* eslint-disable complexity */
import { Command, Flags } from '@oclif/core';

export default class SlackCommand extends Command {
  static override description =
    'Submit data about a junit/mocha report to Slack';

  static override flags = {
    channelAllId: Flags.string({
      default: '',
      description:
        'An alternative slack channel id to send the ALL message to (ignore skipSuccessful flag)',
    }),
    channelId: Flags.string({
      description: 'The slack channel id to send the message to',
      required: true,
    }),
    module: Flags.string({
      char: 'm',
      default: 'A Jahia module',
      description:
        'The ID of the module being tested (for example, name of the module), overwridden if moduleFilepath is provided',
    }),
    moduleFilepath: Flags.string({
      description:
        'Fetch version details from a version JSON generated with utils:modules (overwrites module)',
    }),
    msgAuthor: Flags.string({
      default: 'Jahia-Reporter',
      description: 'Author of the slack message being sent',
    }),
    msgIconFailure: Flags.string({
      default: ':x:',
      description: 'Icon attached to the message if tests are failing',
    }),
    msgIconSuccess: Flags.string({
      default: ':white_check_mark:',
      description: 'Icon attached to the message if tests are successful',
    }),
    notify: Flags.string({
      default: '',
      description:
        'List of people to notify, separated by <>, for example: <MyUsername> <AnotherUser>',
    }),
    runUrl: Flags.string({
      default: '',
      description: 'Url associated with the run',
    }),
    skip: Flags.boolean({
      char: 's',
      description:
        'Do not send the message to slack but only print it to console',
    }),
    skipSuccessful: Flags.boolean({
      default: false,
      description: 'Do not send slack notifications if all tests are passing',
    }),
    sourcePath: Flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't',
      default: 'xml',
      description: 'The format of the report',
      options: ['xml', 'json'] as const,
    }),
    token: Flags.string({
      description: 'The slack token used to post the messages',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    this.log(
      'DEPRECATION WARNING: This command is deprecated and will be removed in a future version.',
    );
    this.log('Existing without doing anything.');
  }
}
