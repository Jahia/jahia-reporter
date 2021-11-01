/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {api} from '@pagerduty/pdjs'
import * as md5 from 'md5'

import {JRRun} from '../../global.type'
import ingestReport from '../../utils/ingest'

class JahiaPagerDutyIncident extends Command {
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
    service: flags.string({
      description: 'Name of the service that triggered this incident (ex: graphql-dxm-provider)',
      default: 'Jahia module',
    }),
    sourceUrl: flags.string({
      description: 'URL back to the service who initiated the incident',
      default: '',
    }),
    pdApiKey: flags.string({
      description: 'Pagerduty API Key',
      required: true,
    }),
    pdReporterEmail: flags.string({
      description: 'Pagerduty email of the user who created the incident',
      required: true,
    }),

    pdEventLinkText: flags.string({
      description: 'Name of the link to obtain more details about the run',
      default: '',
    }),
    pdEventLinkHref: flags.string({
      description: 'Link to obtain more details about the run',
      default: '',
    }),
    pdUserId: flags.string({
      description: 'User ID to assign the incident to (format: P2LGAVW)',
      required: true,
    }),
    pdServiceId: flags.string({
      description: 'Service ID to attach the incident to (format: PF5J3UC)',
      required: true,
    }),
    dryRun: flags.boolean({
      description: 'Do not send the data but only print it to console',
      default: false,
    }),
  }

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaPagerDutyIncident)

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
    const dedupKey = `${md5(JSON.stringify(sortedTests))}`

    let bodyDetails = `Source URL: ${flags.sourceUrl} \n`
    bodyDetails = `Test summary for: ${flags.service} - ${jrRun.tests} tests - ${jrRun.failures} failures`
    const failedReports = jrRun.reports.filter(r => r.failures > 0)
    failedReports.forEach(failedReport => {
      const failedSuites = failedReport.testsuites.filter(s => s.failures > 0)
      failedSuites.forEach(failedSuite => {
        bodyDetails += `\nSuite: ${failedSuite.name} - ${failedSuite.tests.length} tests - ${failedSuite.failures} failures\n`
        const failedTests = failedSuite.tests.filter(t => t.status ===  'FAIL')
        failedTests.forEach(failedTest => {
          bodyDetails += ` |-- ${failedTest.name} (${failedTest.time}s) - ${failedTest.failures.length > 1 ? failedTest.failures.length + ' failures' : ''} \n`
        })
      })
    })

    const pdPayload = {
      incident: {
        type: 'incident',
        title: `${flags.service} - Tests: ${jrRun.failures} failed out of ${jrRun.tests} - #${dedupKey}`,
        service: {
          id: flags.pdServiceId,
          type: 'service_reference',
        },
        body: {
          type: 'incident_body',
          details: bodyDetails,
        },
        status: 'triggered',
        assignments: [
          {
            assignee: {
              id: flags.pdUserId,
              type: 'user_reference',
            },
          },
        ],
      },
    }

    // eslint-disable-next-line no-console
    console.log(pdPayload)

    if (flags.dryRun === false) {
      const pd = api({token: flags.pdApiKey, ...{
        headers: {
          From: 'fgerthoffert@jahia.com',
        },
      }})
      const incidentResponse = await pd.post('/incidents', {data: pdPayload})
      if (incidentResponse.data !== undefined && incidentResponse.data.incident !== undefined) {
        this.log(`Pagerduty Incident created: ${incidentResponse.data.incident.incident_number} - ${incidentResponse.data.incident.html_url}`)
      } else {
        // eslint-disable-next-line no-console
        console.log(incidentResponse)
      }
    } else {
      this.log('DRYRUN: Data not submitted to PagerDuty')
    }
  }
}

export = JahiaPagerDutyIncident
