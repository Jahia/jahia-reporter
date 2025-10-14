/* eslint max-depth: ["error", 5] */
import {Command, flags} from '@oclif/command'
import {api} from '@pagerduty/pdjs'
import * as md5 from 'md5'
import * as fs from 'fs'

import {GoogleSpreadsheet} from 'google-spreadsheet'

import {JRRun} from '../../global.type'
import ingestReport from '../../utils/ingest'
import {resolveIncidents} from '../../utils/pagerduty/resolve-incidents'

const findSheetByTitle = (doc: any, title: string): any => {
  const sheetCount = doc.sheetCount
  for (let i = 0; i < sheetCount; i++) {
    // eslint-disable-next-line no-console
    console.log(`Found sheet with title: ${doc.sheetsByIndex[i].title}`)
    if (doc.sheetsByIndex[i].title === title) {
      return doc.sheetsByIndex[i]
    }
  }
  return null
}

const getSpreadsheetRows = async (googleSpreadsheetId: string, googleClientEmail: string, googleApiKey: string, worksheetTitle: string) => {
  const doc = new GoogleSpreadsheet(googleSpreadsheetId)
  await doc.useServiceAccountAuth({
    client_email: googleClientEmail,
    private_key: Buffer.from(googleApiKey, 'base64').toString(),
  })
  await doc.loadInfo()
  const sheet = findSheetByTitle(doc, worksheetTitle)
  return sheet.getRows()
}

class JahiaPagerDutyIncident extends Command {
  static description = 'Create a pagerduty event based on a test report'

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    incidentMessage: flags.string({
      description: 'A string containing an incident message',
      default: '',
    }),
    incidentDetailsPath: flags.string({
      description: 'A file containing the details about the incident',
      default: '',
    }),
    sourcePath: flags.string({
      description: 'A json/xml report or a folder containing one or multiple json/xml reports',
      default: '',
    }),
    sourceType: flags.string({
      char: 't',                                // shorter flag version
      description: 'The format of the report',  // help description for flag
      options: ['xml', 'json', 'json-perf'],    // only allow the value to be from a discrete set
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
    forceSuccess: flags.boolean({
      description: 'If provided, will force the failure count to 0, disrespective of the actual failure in the reports',
      default: false,
    }),
    ignorePreviousIncidents: flags.boolean({
      description:
        'If provided, will not resolve previous incidents for the same service when there are currently no failures',
      default: false,
    }),
    // Setup Google Auth: https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
    googleSpreadsheetId: flags.string({
      description: 'ID of the spreadsheet container user assignment for the service',
      default: '',
    }),
    googleWorksheetName: flags.string({
      description: 'Name of the worksheet to use within the Spreadsheet',
      default: 'Pagerduty',
    }),
    googleClientEmail: flags.string({
      description: 'Google Client email required to access the spreadsheet',
      default: '',
    }),
    googleApiKey: flags.string({
      description: 'Google Client API key required to access the spreadsheet (base64)',
      default: '',
    }),
    googleUpdateState: flags.boolean({
      description: 'Update the State column to PASSED/FAILED based on the outcome of the tests',
      default: false,
    }),
    pdApiKey: flags.string({
      description: 'Pagerduty API Key',
      required: true,
    }),
    pdReporterEmail: flags.string({
      description: 'Pagerduty email of the user who created the incident',
      required: true,
    }),
    pdReporterId: flags.string({
      description: 'Pagerduty ID of the user who created the incident',
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
    pdTwoStepsAssign: flags.boolean({
      description: 'Immediately assign incident to assignee. If false, the incident will first be assigned to the reporter, then re-assign to assignee. This is needed for slack (@user) to be sent to the channel.',
      default: true,
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
    incidentBody += 'An error is present in the test execution workflow.\nThis usually means one of the steps of the workflow (tests or other) failed or that the reporter was unable to access reports data.'
    let incidentTitle = `${flags.service} - Incident during test execution`

    let testTotal = 999
    let testFailures = 999
    let testSkipped = 0
    let pagerDutyNotifEnabled = true

    if (flags.incidentMessage.length > 0) {
      // This is used to send a message not necessarily related to tests, for example if a build or publish workflow failed on a primary branch
      incidentTitle = `${flags.service} - ${flags.incidentMessage}`
      dedupKey = md5(incidentTitle)
      incidentBody = `Source URL: ${flags.sourceUrl} \n`
      incidentBody += `Dedup Key: ${dedupKey} \n`

      if (flags.incidentDetailsPath !== '' && fs.existsSync(flags.incidentDetailsPath)) {
        const errorLogs = fs.readFileSync(flags.incidentDetailsPath)
        incidentBody += `Test summary for: ${flags.service} - ${flags.incidentMessage}\n\n${errorLogs}`
      }
    } else if (flags.sourcePath.length > 0) {
      if (fs.existsSync(flags.sourcePath)) {
        // Parse files into objects
        const jrRun: JRRun = await ingestReport(flags.sourceType, flags.sourcePath, this.log)
        testFailures = jrRun.failures
        testSkipped = jrRun.skipped
        testTotal = jrRun.tests
        // eslint-disable-next-line no-console
        console.log(jrRun)

        // There are times at which the failures might actually be negatives due to skipped tests
        // In such cases, we put the failures back to 0
        if (testSkipped > 0 && testFailures < 0 && testFailures + testSkipped === 0) {
          testFailures = 0
        }

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

        incidentTitle = `${flags.service} - Tests: ${jrRun.failures} failed out of ${jrRun.tests}`

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
      } else {
        incidentTitle = `${flags.service} - Tests not executed`
        dedupKey = md5(incidentTitle)
        incidentBody = `Source URL: ${flags.sourceUrl} \n`
        incidentBody += `Dedup Key: ${dedupKey} \n`
        incidentBody += `Test error: The following path does not exist: ${flags.sourcePath}`
      }
    } else {
      this.log('ERROR: Please provide either sourcePath or incidentMessage')
      this.exit(1)
    }

    if (flags.forceSuccess) {
      // The script has been forced to success
      this.log(`The script has been forced to success, the actual failure found was: ${testFailures}`)
      testFailures = 0
      testTotal = 0
    }

    // Note, the spreadsheet must be shared with the email provided in flags.googleClientEmail
    const assignees: string[] = flags.pdUserId.split(',').filter((a: string) => a.length > 4)
    let pagerDutyServiceId = flags.pdServiceId
    if (flags.googleSpreadsheetId === '') {
      this.log('Google Spreadsheet ID has not been set')
    } else {
      this.log(`Fetching data from Google Spreadsheet ${flags.googleSpreadsheetId}`)
      // There are sometimes some unavailability of the GitHub API
      let spRows: any[] = []
      for (let cpt = 1; cpt < 4; cpt++) {
        if (spRows.length === 0) {
          this.log(`Connecting to spreadsheet: ${cpt}/3`)
          try {
            // eslint-disable-next-line no-await-in-loop
            spRows = await getSpreadsheetRows(flags.googleSpreadsheetId, flags.googleClientEmail, flags.googleApiKey, flags.googleWorksheetName)
          } catch {
            this.log('Unable to connect to spreadsheet')
          }
        }
      }
      for (const row of spRows) {
        if (row['Test Service'] === flags.service) {
          if (row['PagerDuty Enabled'] !== undefined && row['PagerDuty Enabled'].toLowerCase() === 'no') {
            pagerDutyNotifEnabled = false
          }
          if (row['PagerDuty Service ID'] !== undefined && row['PagerDuty Service ID'].length > 4) {
            pagerDutyServiceId = row['PagerDuty Service ID']
          }
          if (row['PagerDuty User ID'] !== undefined) {
            for (const assignee of row['PagerDuty User ID'].split(',').filter((a: string) => a.length > 4)) {
              assignees.push(assignee)
            }
          }
          if (flags.googleUpdateState && (row['CI/CD'] === 'Bamboo' || row['CI/CD'] === 'GitHub')) {
            this.log(`Updated state for: ${flags.service}`)
            if (testFailures > 0) {
              row.State = 'FAILED'
            } else {
              row.State = 'PASSED'
            }
            row.Updated = new Date().toISOString()
            row.Total = testTotal
            row.Failures = testFailures
            this.log(`Saving Google Spreadsheet row for: ${row['Test Service']}`)
            // eslint-disable-next-line no-await-in-loop
            await row.save()
          }
        }
      }
    }

    let firstAssignees = assignees
    if (flags.pdTwoStepsAssign) {
      firstAssignees = [flags.pdReporterId]
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
        assignments: firstAssignees.map(assignee => {
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
    this.log('JSON Payload for submission', JSON.stringify(pdPayload))

    const pd = api({token: flags.pdApiKey, ...{
      headers: {
        From: flags.pdReporterEmail,
      },
    }})
    if (flags.dryRun) {
      this.log('DRYRUN: Data not submitted to PagerDuty')
    } else if (testFailures === 0) {
      this.log(
        'There are 0 failures in the provided reports, not submitting a new incident to pagerduty',
      )
      if (flags.ignorePreviousIncidents === false) {
        resolveIncidents(pd, pagerDutyServiceId, flags.service, flags.sourceUrl)
      }
    } else if (assignees.length === 0 && flags.requireAssignee) {
      this.log('No assignees found, incident will not be created')
    } else if (pagerDutyNotifEnabled === false) {
      this.log('According to the Google Spreadsheet, notifications are current disabled for that service')
    } else {
      const incidentResponse = await pd.post('/incidents', {data: pdPayload})
      if (incidentResponse.data !== undefined && incidentResponse.data.incident !== undefined) {
        this.log(`Pagerduty Incident created: ${incidentResponse.data.incident.incident_number} - ${incidentResponse.data.incident.html_url}`)

        // If assignees were not directly assigned, they now get assigned by updating the incident.
        // As of Nov 17, 2021, PagerDuty does not `@user` assignee in slack when incident is created.
        // But it does notify users when incident is reassigned, thus this second call to handle it.
        if (flags.pdTwoStepsAssign) {
          const updatePayload = {
            incident: {
              type: 'incident',
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
          const updateResponse = await pd.put(`/incidents/${incidentResponse.data.incident.id}`, {data: updatePayload})
          if (updateResponse.data !== undefined && updateResponse.data.incident !== undefined) {
            this.log(`Pagerduty Incident updated: ${updateResponse.data.incident.incident_number} - ${updateResponse.data.incident.html_url}`)
          } else {
            this.log('Incident not updated')
            this.log(updateResponse.data.error)
          }
        }
      } else {
        this.log('Incident not created')
        this.log(incidentResponse.data.error)
      }
    }
  }
}

export = JahiaPagerDutyIncident
