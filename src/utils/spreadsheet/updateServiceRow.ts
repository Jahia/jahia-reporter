import { Incident } from '../../types/index.js';

// Get the row matching a specific service from a Google Spreadsheet

const getServiceRow = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worksheet: any,
  service: string,
  log: (message: string) => void,
) => {
  log(`Searching for row matching service: ${service}`);
  const allRows = await worksheet.getRows();
  for (const row of allRows) {
    if (row.get('Test Service') === service) {
      log(`Found service ${service} at row number: ${row.rowNumber}`);
      return row;
    }
  }

  log(`No service row found for: ${service}`);
  return null;
};

// Sort the data rows (below the header row) by the 'Test Service' column.
// google-spreadsheet's worksheet.sortRange() is an empty stub, so the
// sortRange request of the Sheets API is sent directly.
const sortByService = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worksheet: any,
  log: (message: string) => void,
) => {
  const serviceColumn = worksheet.headerValues.indexOf('Test Service');
  if (serviceColumn === -1) {
    log('No Test Service column found, the worksheet is not sorted');
    return;
  }

  await worksheet._makeSingleUpdateRequest('sortRange', {
    range: { sheetId: worksheet.sheetId, startRowIndex: 1 },
    sortSpecs: [{ dimensionIndex: serviceColumn, sortOrder: 'ASCENDING' }],
  });
  log('Sorted the worksheet by Test Service');
};

export const updateServiceRow = async ({
  incidentContent,
  log,
  repository,
  service,
  worksheet,
}: {
  incidentContent: Incident;
  log: (message: string) => void;
  repository: string;
  service: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  worksheet: any;
}) => {
  const row = await getServiceRow(worksheet, service, log);
  if (row) {
    row.set('Repository', repository);
    row.set('State', incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED');
    row.set('Updated', new Date().toISOString());
    row.set('Total', incidentContent.counts.total);
    row.set('Failures', incidentContent.counts.fail);
    row.set('Link', incidentContent.sourceUrl);
    await row.save();
    log(`Updated service ${service} located at row number: ${row.rowNumber}`);
    return row;
  }

  log(`No existing row for service ${service}`);
  const newRow = await worksheet.addRow({
    Failures: incidentContent.counts.fail,
    Link: incidentContent.sourceUrl,
    Repository: repository,
    State: incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED',
    'Test Service': service,
    Total: incidentContent.counts.total,
    Updated: new Date().toISOString(),
  });
  log(
    `Created new row for service ${service} located at row number: ${newRow.rowNumber}`,
  );
  await sortByService(worksheet, log);
  return newRow;
};
