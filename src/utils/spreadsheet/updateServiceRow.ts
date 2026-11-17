import { Incident } from '../../types/index.js';

// Values used when a service row leaves the project status or priority empty
export const DEFAULT_PROJECT_STATUS = 'In Progress';
export const DEFAULT_PROJECT_PRIORITY = 'Now';

// Columns a new service row copies from another row of the same repository
const INHERITED_COLUMNS = ['Assignee', 'Project Number', 'Project Team'];

// Get the row matching a specific service from a Google Spreadsheet
const getServiceRow = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRows: any[],
  service: string,
  log: (message: string) => void,
) => {
  log(`Searching for row matching service: ${service}`);
  for (const row of allRows) {
    if (row.get('Test Service') === service) {
      log(`Found service ${service} at row number: ${row.rowNumber}`);
      return row;
    }
  }

  log(`No service row found for: ${service}`);
  return null;
};

// Get the first row of the repository that names an assignee
const getRepositoryRow = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRows: any[],
  repository: string,
) =>
  allRows.find(
    (row) =>
      repository !== '' &&
      row.get('Repository') === repository &&
      (row.get('Assignee') || '') !== '',
  ) ?? null;

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
  const allRows = await worksheet.getRows();
  const row = getServiceRow(allRows, service, log);
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
  const inherited: Record<string, string> = {};
  const repositoryRow = getRepositoryRow(allRows, repository);
  if (repositoryRow) {
    for (const column of INHERITED_COLUMNS) {
      const value = repositoryRow.get(column);
      if (value !== undefined && value !== '') {
        inherited[column] = value;
      }
    }

    log(
      `Copied ${Object.keys(inherited).join(', ')} from row number ${repositoryRow.rowNumber} of repository ${repository}`,
    );
  } else {
    log(`No other row of repository ${repository} names an assignee`);
  }

  const newRow = await worksheet.addRow({
    ...inherited,
    Failures: incidentContent.counts.fail,
    Link: incidentContent.sourceUrl,
    'Project Priority': DEFAULT_PROJECT_PRIORITY,
    'Project Status': DEFAULT_PROJECT_STATUS,
    Repository: repository,
    State: incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED',
    'Test Service': service,
    Total: incidentContent.counts.total,
    Updated: new Date().toISOString(),
  });
  log(
    `Created new row for service ${service} located at row number: ${newRow.rowNumber}`,
  );
  return newRow;
};
