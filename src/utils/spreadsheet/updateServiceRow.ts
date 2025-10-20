import {Incident} from '../../global.type'

// Get the row matching a specific service from a Google Spreadsheet
const getServiceRow = async (worksheet: any, service: string, log: any) => {
  log(`Searching for row matching service: ${service}`)
  const allRows = await worksheet.getRows()
  for (const row of allRows) {
    if (row.get('Test Service') === service) {
      log(`Found service ${service} at row number: ${row.rowNumber}`)
      return row
    }
  }

  log(`No service row found for: ${service}`)
  return null
}

export const updateServiceRow = async (
  worksheet: any,
  service: string,
  incidentContent: Incident,
  log: any,
) => {
  const row = await getServiceRow(worksheet, service, log)
  if (row) {
    row.set('State', incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED')
    row.set('Updated', new Date().toISOString())
    row.set('Total', incidentContent.counts.total)
    row.set('Failures', incidentContent.counts.fail)
    row.set('Link', incidentContent.sourceUrl)
    await row.save()
    log(`Updated service ${service} located at row number: ${row.rowNumber}`)
    return row
  }

  log(`No existing row for service ${service}`)
  const newRow = await worksheet.addRow({
    Failures: incidentContent.counts.fail,
    Link: incidentContent.sourceUrl,
    'PagerDuty User ID': '[REPO_CHAMPION]',
    State: incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED',
    'Test Service': service,
    Total: incidentContent.counts.total,
    Updated: new Date().toISOString(),
  })
  log(
    `Created new row for service ${service} located at row number: ${newRow.rowNumber}`,
  )
  return newRow
}
