/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {api} from '@pagerduty/pdjs'
import * as md5 from 'md5'
import * as fs from 'fs'

import {GoogleSpreadsheet} from 'google-spreadsheet'

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
      char: 't',                                // shorter flag version
      description: 'The format of the report',  // help description for flag
      options: ['xml', 'json'],                 // only allow the value to be from a discrete set
      default: 'xml',
    }),
    service: flags.string({
      description: 'Name of the service that triggered this incident (ex: graphql-dxm-provider)',
      required: true,
    }),
    sourceUrl: flags.string({
      description: 'URL back to the service who initiated the incident',
      default: '',
    }),
    // Setup Google Auth: https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
    googleSpreadsheetId: flags.string({
      description: 'ID of the spreadsheet container user assignment for the service',
      default: '',
    }),
    googleClientEmail: flags.string({
      description: 'Google Client email required to access the spreadsheet',
      default: '',
    }),
    googleApiKey: flags.string({
      description: 'Google Client API key required to access the spreadsheet (base64)',
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
    pdUserId: flags.string({
      description: 'User ID to assign the incident to (format: P2LGAVW)',
      default: '',
    }),
    pdServiceId: flags.string({
      description: 'Service ID to attach the incident to (format: PF5J3UC)',
      default: '',
    }),
    dryRun: flags.boolean({
      description: 'Do not send the data but only print it to console',
      default: false,
    }),
    requireAssignee: flags.boolean({
      description: 'Only create incident in pagerduty if an assignee is present',
      default: true,
    }),
  }

  // eslint-disable-next-line complexity
  async run() {
    const {flags} = this.parse(JahiaPagerDutyIncident)

    // Default values in the event the report couldn't be accessed
    let dedupKey = md5('Unable to access reports')
    let incidentBody = `Source URL: ${flags.sourceUrl} \n`
    incidentBody += 'An error is present in the test execution workflow.\n This usually means one of the steps of the workflow (tests or other) did fail.'
    let incidentTitle = `${flags.service} - Incident during test execution`

    if (fs.existsSync(flags.sourcePath)) {
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

      incidentTitle = `${flags.service} - Tests: ${jrRun.failures} failed out of ${jrRun.tests} - #${dedupKey}`

      dedupKey = md5(incidentTitle + JSON.stringify(sortedTests))

      incidentBody = `Source URL: ${flags.sourceUrl} \n`
      incidentBody += `Dedup Key: ${dedupKey} \n`
      incidentBody += `Test summary for: ${flags.service} - ${jrRun.tests} tests - ${jrRun.failures} failures`
      const failedReports = jrRun.reports.filter(r => r.failures > 0)
      failedReports.forEach(failedReport => {
        const failedSuites = failedReport.testsuites.filter(s => s.failures > 0)
        failedSuites.forEach(failedSuite => {
          incidentBody += `\nSuite: ${failedSuite.name} - ${failedSuite.tests.length} tests - ${failedSuite.failures} failures\n`
          const failedTests = failedSuite.tests.filter(t => t.status ===  'FAIL')
          failedTests.forEach(failedTest => {
            incidentBody += ` |-- ${failedTest.name} (${failedTest.time}s) - ${failedTest.failures.length > 1 ? failedTest.failures.length + ' failures' : ''} \n`
          })
        })
      })
    }

    // Note, the spreadsheet must be shared with the email provided in flags.googleClientEmail
    const assignees: string[] = flags.pdUserId.split(',').filter((a: string) => a.length > 4)
    let pagerDutyServiceId = flags.pdServiceId
    if (flags.googleSpreadsheetId !== '') {
      this.log(`Fetching data from Google Spreasheet ${flags.googleSpreadsheetId}`)
      const doc = new GoogleSpreadsheet(flags.googleSpreadsheetId)
      await doc.useServiceAccountAuth({
        client_email: flags.googleClientEmail,
        private_key: Buffer.from(flags.googleApiKey, 'base64').toString(),
      })
      await doc.loadInfo()
      const sheet = doc.sheetsByIndex[0]
      const rows = await sheet.getRows()
      for (const row of rows) {
        if (row['Test Service'] === flags.service) {
          if (row['PagerDuty Service ID'] !== undefined && row['PagerDuty Service ID'].length > 4) {
            pagerDutyServiceId = row['PagerDuty Service ID']
          }
          if (row['PagerDuty User ID'] !== undefined) {
            for (const assignee of row['PagerDuty User ID'].split(',').filter((a: string) => a.length > 4)) {
              assignees.push(assignee)
            }
          }
        }
      }
    }

    const pdPayload = {
      incident: {
        type: 'incident',
        title: incidentTitle,
        incident_key: dedupKey,
        service: {
          id: pagerDutyServiceId,
          type: 'service_reference',
        },
        body: {
          type: 'incident_body',
          details: incidentBody,
        },
        status: 'triggered',
        assignments: assignees.map(assignee => {
          return {
            assignee: {
              id: assignee,
              type: 'user_reference',
            },
          }
        }),
      },
    }

    // eslint-disable-next-line no-console
    this.log('JSON Payload', JSON.stringify(pdPayload))

    if (flags.dryRun === true) {
      this.log('DRYRUN: Data not submitted to PagerDuty')
    } else if (assignees.length === 0 && flags.requireAssignee === true) {
      this.log('No assignees found, incident will not be created')
    } else {
      const pd = api({token: flags.pdApiKey, ...{
        headers: {
          From: 'fgerthoffert@jahia.com',
        },
      }})
      const incidentResponse = await pd.post('/incidents', {data: pdPayload})
      if (incidentResponse.data !== undefined && incidentResponse.data.incident !== undefined) {
        this.log(`Pagerduty Incident created: ${incidentResponse.data.incident.incident_number} - ${incidentResponse.data.incident.html_url}`)
      } else {
        this.log('Incident not created')
        this.log(incidentResponse.data.error)
      }
    }
  }
}

export = JahiaPagerDutyIncident
