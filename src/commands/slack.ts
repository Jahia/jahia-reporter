import {Command, flags} from '@oclif/command'
import fetch from 'node-fetch'
import * as fs from 'fs'

import {UtilsVersions, JRTestsuite} from '../global.type'

import ingestReport from '../utils/ingest'

interface SlackMsg {
  text: string;
  type: string;
  thread_ts?: string;
  username: string;
  icon_emoji: string;
}

class JahiaSlackReporter extends Command {
  static description = 'Submit data about a junit/mocha report to Slack'

  static flags = {
    help: flags.help({char: 'h'}),
    sourcePath: flags.string({
      description: 'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: flags.string({
      char: 't',                        // shorter flag version
      description: 'The format of the report',  // help description for flag
      options: ['xml', 'json'],         // only allow the value to be from a discrete set
      default: 'xml',
    }),
    webhook: flags.string({
      description: 'The slack Webhook URL to send the message to',
      required: true,
    }),
    webhookAll: flags.string({
      description: 'An alternative slack Webhook URL to send the ALL message to (ignore skipSuccessful flag)',
      default: '',
    }),
    msgAuthor: flags.string({
      description: 'Author of the slack message being sent',
      default: 'Jahia-Reporter',
    }),
    msgIconFailure: flags.string({
      description: 'Icon attached to the message if tests are failing',
      default: ':x:',
    }),
    msgIconSuccess: flags.string({
      description: 'Icon attached to the message if tests are successful',
      default: ':white_check_mark:',
    }),
    moduleFilepath: flags.string({
      description: 'Fetch version details from a version JSON generated with utils:modules (overwrites module)',
    }),
    module: flags.string({
      char: 'm',
      description: 'The ID of the module being tested (for example, name of the module), overwridden if moduleFilepath is provided',
      default: 'A Jahia module',
    }),
    runUrl: flags.string({
      description: 'Url associated with the run',
      default: '',
    }),
    notify: flags.string({
      description: 'List of people to notify, separated by <>, for example: <MyUsername> <AnotherUser>',
      default: '',
    }),
    skip: flags.boolean({
      char: 's',
      description: 'Do not send the message to slack but only print it to console',
    }),
    skipSuccessful: flags.boolean({
      description: 'Do not send slack notifications if all tests are passing',
      default: false,
    }),
  }

  slackMsgForSuite(msg: string, failedSuite: JRTestsuite) {
    msg += `Suite: ${failedSuite.name} - ${failedSuite.tests.length} tests - ${failedSuite.failures} failures\n`
    const failedTests = failedSuite.tests.filter(t => t.status ===  'FAIL')
    failedTests.forEach(failedTest => {
      msg += ` |-- ${failedTest.name} (${failedTest.time}s) - ${failedTest.failures.length > 1 ? failedTest.failures.length + ' failures' : ''} \n`
    })
    return msg
  }

  async run() {
    const {flags} = this.parse(JahiaSlackReporter)

    // Extract a report object from the actual report files (either XML or JSON)
    const report = await ingestReport(flags.sourceType, flags.sourcePath, this.log)

    let msg = ''
    let threadMsg = ''

    // If a Jahia GraphQL API is specified, we actually call Jahia to learn more
    let module = flags.module
    if (flags.moduleFilepath !== undefined) {
      const versionFile: any = fs.readFileSync(flags.moduleFilepath)
      const version: UtilsVersions = JSON.parse(versionFile)
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
        msg += ' and more in the thread\n```\n'
        const firstFailedSuites = failedReports[0].testsuites.filter(s => s.failures > 0)
        firstFailedSuites.forEach(failedSuite => {
          msg += this.slackMsgForSuite(msg, failedSuite)
        })

	for (let r = 1; r < failedReports.length; r++) {
          const nextFailedSuites = failedReports[r].testsuites.filter(s => s.failures > 0)
          nextFailedSuites.forEach(failedSuite => {
            threadMsg += this.slackMsgForSuite(threadMsg, failedSuite)
          })
        }
      } else if (failedReports.length === 1) {
        const failedSuites = failedReports[0].testsuites.filter(s => s.failures > 0)

	// In case there's only 1 report, only show the first failing suite in the message and the rest in a thread
        if (failedSuites.length > 1) {
          msg += ' and more in the thread\n```\n'
          msg += this.slackMsgForSuite(msg, failedSuites[0])
          for (let s = 1; s < failedSuites.length; s++) {
             threadMsg += this.slackMsgForSuite(threadMsg, failedSuites[s])
          }
        } else if (failedSuites.length === 1) {
          msg += '\n```\n'
          msg += this.slackMsgForSuite(msg, failedSuites[0])
        }
      }

      if (failedReports.length > 0) {
        msg += '```\n'
      }

      if (flags.notify.length !== 0 && report.failures > 0) {
        msg += `${flags.notify}`
      }
    }
    const slackPayload = {
      text: msg,
      type: 'mrkdwn',
      username: flags.msgAuthor,
      icon_emoji: report.failures === 0 ? flags.msgIconSuccess : flags.msgIconFailure,
    }

    if (flags.skip) {
      this.log(JSON.stringify(slackPayload))
      this.exit(0)
    }

    let slackResponse: any = {}
    if (!flags.skipSuccessful) {
      slackResponse = await fetch(flags.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      })
    } else if (flags.skipSuccessful && report.failures > 0) {
      slackResponse = await fetch(flags.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      })
    }

    let slackThreadPayload: SlackMsg | null = null
    if (slackResponse.data !== undefined
      && slackResponse.data.ok === "true") {
      slackThreadPayload = {
        text: threadMsg,
        type: 'mrkdwn',
        thread_ts: slackResponse.data.ts,
        username: flags.msgAuthor,
        icon_emoji: report.failures === 0 ? flags.msgIconSuccess : flags.msgIconFailure,
      }

      await fetch(flags.webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackThreadPayload),
      })
    }

    // Handle the publication in the ALL channel
    if (flags.webhookAll !== '') {
      slackResponse = await fetch(flags.webhookAll, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackPayload),
      })

      if (slackResponse.data !== undefined
        && slackResponse.data.ok === "true") {
        slackThreadPayload = {
          text: threadMsg,
          type: 'mrkdwn',
          thread_ts: slackResponse.data.ts,
          username: flags.msgAuthor,
          icon_emoji: report.failures === 0 ? flags.msgIconSuccess : flags.msgIconFailure,
        }

        await fetch(flags.webhookAll, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackThreadPayload),
        })
      }
    }
  }
}

export = JahiaSlackReporter
