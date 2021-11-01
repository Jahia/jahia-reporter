/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {event} from '@pagerduty/pdjs'
import * as md5 from 'md5'

import {JRRun} from '../global.type'
import ingestReport from '../utils/ingest'

class JahiaTestrailReporter extends Command {
  static description = 'Create a pagerduty event based on a test report'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
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
    pdRoutingKey: flags.string({
      description: 'Pagerduty API Event routing key (Service Integration Key)',
      required: true,
    }),
    pdEventSource: flags.string({
      description: 'Pagerduty API Event source (for example the module name)',
      default: 'Jahia module',
    }),
    pdEventLinkText: flags.string({
      description: 'Name of the link to obtain more details about the run',
      default: '',
    }),
    pdEventLinkHref: flags.string({
      description: 'Link to obtain more details about the run',
      default: '',
    }),
    dryrun: flags.boolean({
      description: 'Do not send the data but only print it to console',
      default: false,
    }),
  }

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaTestrailReporter)

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(flags.sourceType, flags.sourcePath, this.log)
    // eslint-disable-next-line no-console
    console.log(jrRun)

    // Generate dedup key by collecting all testnames

    const tests: string[] = []
    for (const report of jrRun.reports) {
      for (const testsuite of report.testsuites) {
        for (const test of testsuite.tests) {
          tests.push(`${report.name}-${testsuite.name}-${test.name}`)
        }
      }
    }
    const sortedTests = tests.sort()
    const dedupKey = `testshash_${md5(JSON.stringify(sortedTests))}`

    const pdPayload: any = {
      routing_key: flags.pdRoutingKey,
      event_action: jrRun.failures === 0 ? 'resolve' : 'trigger',
      dedup_key: dedupKey,
      payload: {
        summary: `${flags.pdEventSource} - Tests: ${jrRun.failures} failed out of ${jrRun.tests}`,
        source: flags.pdEventSource,
        severity: 'error',
      },
      links: [{
        href: flags.pdEventLinkHref,
        text: flags.pdEventLinkText,
      }],
    }

    // eslint-disable-next-line no-console
    console.log(pdPayload)

    if (flags.dryrun === false) {
      // https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgx-sending-an-alert-event
      const eventResponse = await event({
        data: pdPayload,
      })
      this.log(`Pagerduty API response: ${eventResponse.data.message}`)
    } else {
      this.log('DRYRUN: Data not submitted to PagerDuty')
    }
  }
}

export = JahiaTestrailReporter
