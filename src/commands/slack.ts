import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'

import ingestReport from '../utils/ingest'

class JahiaSlackReporter extends Command {
  static description = 'Submit data about a junit/mocha report to Slack'

  static args = [
    {name: 'file',
      required: true,
      description: 'A json/xml report or a folder containing one or multiple json/xml reports'},
    {name: 'webhook',
      required: true,
      description: 'The slack Webhook URL'},
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    type: flags.string({
      char: 't',                        // shorter flag version
      description: 'report file type',  // help description for flag
      options: ['xml', 'json'],         // only allow the value to be from a discrete set
      default: 'xml',
    }),
    skip: flags.boolean({
      char: 's',
      description: 'Skip slack submission',
    }),
    skipSuccessful: flags.boolean({
      char: 'g',
      description: 'Do not send slack notifications if all tests are passing',
    }),
    module: flags.string({
      char: 'm',
      description: 'Name of the element being tested (for example, name of the module)',
      default: 'A Jahia module',
    }),
    url: flags.string({
      char: 'u',
      description: 'Url associated with the run',
      default: '',
    }),
    notifications: flags.string({
      char: 'n',
      description: 'List of people to notify, separated by <>, for example: <MyUsername>',
      default: '',
    }),
    iconfailure: flags.string({
      char: 'i',
      description: 'Icon attached to the notification if tests are failing',
      default: ':x:',
    }),
    iconsuccess: flags.string({
      char: 'o',
      description: 'Icon attached to the notification if tests are successful',
      default: ':white_check_mark:',
    }),
    webhookusername: flags.string({
      char: 'w',
      description: 'Webhook username',
      default: 'Testing bot',
    }),
  }

  async run() {
    const {args, flags} = this.parse(JahiaSlackReporter)

    // Extract a report object from the actual report files (either XML or JSON)
    const report = await ingestReport(flags.type, args.file, this.log)

    // Format the failed tests in a message to be submitted to slack
    let msg = `Test summary for: <${flags.url}|${flags.module}> - Failures: ${report.failures}/${report.tests} \n`
    const failedReports = report.reports.filter(r => r.failures > 0)
    if (failedReports.length > 0) {
      msg += '```\n'
    }
    failedReports.forEach(failedReport => {
      const failedSuites = failedReport.testsuites.filter(s => s.failures > 0)
      failedSuites.forEach(failedSuite => {
        msg += `Suite: ${failedSuite.name} - Failures: ${failedSuite.failures}/${failedSuite.tests.length}\n`
        const failedTests = failedSuite.tests.filter(t => t.status ===  'FAIL')
        failedTests.forEach(failedTest => {
          msg += ` |-- ${failedTest.name} (${failedTest.time}s) \n`
        })
      })
    })
    if (failedReports.length > 0) {
      msg += '```\n'
    }

    if (flags.notifications.length !== 0 && report.failures > 0) {
      msg += `${flags.notifications}`
    }

    const slackPayload = {
      text: msg,
      type: 'mrkdwn',
      username: flags.webhookusername,
      icon_emoji: report.failures === 0 ? flags.iconsuccess : flags.iconfailure,
    }

    if (flags.skip || (flags.skipSuccessful && report.failures === 0)) {
      this.log(JSON.stringify(slackPayload))
    } else {
      new SyncRequestClient()
      .addHeader('Content-Type', 'application/json')
      .post(args.webhook, JSON.parse(JSON.stringify(slackPayload)))
    }
  }
}

export = JahiaSlackReporter
