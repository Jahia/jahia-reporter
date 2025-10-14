/* eslint-disable complexity */
import {Command, Flags} from '@oclif/core'
import * as fs from 'fs'
import {UtilsVersions, JRTestsuite, JRRun} from '../global.type'
import ingestReport from '../utils/ingest'
import {WebClient, LogLevel} from '@slack/web-api'

export default class SlackCommand extends Command {
  static override description = 'Submit data about a junit/mocha report to Slack'

  static override flags = {
    sourcePath: Flags.string({
      description: 'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't',
      description: 'The format of the report',
      options: ['xml', 'json'] as const,
      default: 'xml',
    }),
    token: Flags.string({
      description: 'The slack token used to post the messages',
      required: true,
    }),
    channelId: Flags.string({
      description: 'The slack channel id to send the message to',
      required: true,
    }),
    channelAllId: Flags.string({
      description: 'An alternative slack channel id to send the ALL message to (ignore skipSuccessful flag)',
      default: '',
    }),
    msgAuthor: Flags.string({
      description: 'Author of the slack message being sent',
      default: 'Jahia-Reporter',
    }),
    msgIconFailure: Flags.string({
      description: 'Icon attached to the message if tests are failing',
      default: ':x:',
    }),
    msgIconSuccess: Flags.string({
      description: 'Icon attached to the message if tests are successful',
      default: ':white_check_mark:',
    }),
    moduleFilepath: Flags.string({
      description: 'Fetch version details from a version JSON generated with utils:modules (overwrites module)',
    }),
    module: Flags.string({
      char: 'm',
      description: 'The ID of the module being tested (for example, name of the module), overwridden if moduleFilepath is provided',
      default: 'A Jahia module',
    }),
    runUrl: Flags.string({
      description: 'Url associated with the run',
      default: '',
    }),
    notify: Flags.string({
      description: 'List of people to notify, separated by <>, for example: <MyUsername> <AnotherUser>',
      default: '',
    }),
    skip: Flags.boolean({
      char: 's',
      description: 'Do not send the message to slack but only print it to console',
    }),
    skipSuccessful: Flags.boolean({
      description: 'Do not send slack notifications if all tests are passing',
      default: false,
    }),
  }

  // Create text for a failed test suite
  private slackMsgForSuite(failedSuite: JRTestsuite): string {
    let suiteMsg = `Suite: ${failedSuite.name} - ${failedSuite.tests.length} tests - ${failedSuite.failures} failures\n`
    const failedTests = failedSuite.tests.filter(t => t.status === 'FAIL')
    failedTests.forEach(failedTest => {
      suiteMsg += ` |-- ${failedTest.name} (${failedTest.time}s) - ${failedTest.failures.length > 1 ? failedTest.failures.length + ' failures' : ''} \n`
    })
    return suiteMsg
  }

  // Reply to a message with the channel ID and message TS
  private async replyMessage(client: WebClient, id: string, ts: string, msg: string, emoji: string): Promise<void> {
    try {
      await client.chat.postMessage({
        channel: id,
        thread_ts: ts,
        text: msg,
        icon_emoji: emoji,
      })
    } catch (error) {
      this.log(String(error))
    }
  }

  // Post a message to a channel your app is in using ID and message text
  private async publishMessage(client: WebClient, id: string, msg: string, threadMsg: string, emoji: string): Promise<void> {
    try {
      const result = await client.chat.postMessage({
        channel: id,
        text: msg,
        icon_emoji: emoji,
      })

      if (threadMsg !== '' && result.ok === true && result.ts) {
        await this.replyMessage(client, id, result.ts, threadMsg, emoji)
      }
    } catch (error) {
      this.log(String(error))
    }
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SlackCommand)

    const client = new WebClient(flags.token, {
      logLevel: LogLevel.DEBUG,
    })

    // Extract a report object from the actual report files (either XML or JSON)
    const report: JRRun = await ingestReport(flags.sourceType, flags.sourcePath, this.log)

    let msg = ''
    let threadMsg = ''
    const emoji = (report.failures === 0 && report.tests !== 0) ? flags.msgIconSuccess : flags.msgIconFailure

    // If a Jahia GraphQL API is specified, we actually call Jahia to learn more
    let module = flags.module
    if (flags.moduleFilepath !== undefined) {
      const versionFile = fs.readFileSync(flags.moduleFilepath)
      const version: UtilsVersions = JSON.parse(versionFile.toString())
      if (version.jahia.build === '') {
        module = `${version.module.name} v${version.module.version} (Jahia: ${version.jahia.version})`
      } else {
        module = `${version.module.name} v${version.module.version} (Jahia: ${version.jahia.version}-${version.jahia.build})`
      }
      if (version.module.name === 'UNKNOWN') {
        msg = `Error in provisioning the test environment: ${flags.runUrl} \n`
        msg += 'The target module to be tested was not detected in Jahia'
      }
    }

    if (msg === '') {
      // Format the failed tests in a message to be submitted to slack
      msg = `Test summary for: <${flags.runUrl}|${module}> - ${report.tests} tests - ${report.failures} failures`
      const failedReports = report.reports.filter(r => r.failures > 0)

      // If there's more than 1 report, only show the first one in the message and add the rest in a thread
      if (failedReports.length > 1) {
        msg += ' - See the thread for more details\n```\n'
        const firstFailedSuites = failedReports[0].testsuites.filter(s => s.failures > 0)
        firstFailedSuites.forEach(failedSuite => {
          msg += this.slackMsgForSuite(failedSuite)
        })

        threadMsg += '```\n'
        for (let r = 1; r < failedReports.length; r++) {
          const nextFailedSuites = failedReports[r].testsuites.filter(s => s.failures > 0)
          nextFailedSuites.forEach(failedSuite => {
            threadMsg += this.slackMsgForSuite(failedSuite)
          })
        }
      } else if (failedReports.length === 1) {
        const failedSuites = failedReports[0].testsuites.filter(s => s.failures > 0)

        // In case there's only 1 report, only show the first failing suite in the message and the rest in a thread
        if (failedSuites.length > 1) {
          msg += ' - See the thread for more details\n```\n'
          msg += this.slackMsgForSuite(failedSuites[0])
          threadMsg += '```\n'
          for (let s = 1; s < failedSuites.length; s++) {
            threadMsg += this.slackMsgForSuite(failedSuites[s])
          }
        } else if (failedSuites.length === 1) {
          msg += '\n```\n'
          msg += this.slackMsgForSuite(failedSuites[0])
        }
      }

      if (failedReports.length > 0) {
        msg += '```\n'
      }

      if (flags.notify.length !== 0 && report.failures > 0) {
        msg += `${flags.notify}`
      }

      if (threadMsg !== '') {
        threadMsg += '```\n'
      }
    }

    if (flags.skip) {
      const slackPayload = {
        text: msg,
        type: 'mrkdwn',
        channel: flags.channelId,
        username: flags.msgAuthor,
        icon_emoji: emoji,
      }
      const slackThreadPayload = {
        text: threadMsg,
        type: 'mrkdwn',
        channel: flags.channelId,
        username: flags.msgAuthor,
        icon_emoji: emoji,
      }
      this.log(JSON.stringify(slackPayload))
      this.log(JSON.stringify(slackThreadPayload))
      this.exit(0)
    }

    if (!flags.skipSuccessful ||
      (flags.skipSuccessful && report.failures > 0)) {
      await this.publishMessage(client, flags.channelId, msg, threadMsg, emoji)
    }

    // Handle the publication in the ALL channel
    if (flags.channelAllId !== '') {
      await this.publishMessage(client, flags.channelAllId, msg, threadMsg, emoji)
    }
  }
}
