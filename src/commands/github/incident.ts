import { Command, Flags } from '@oclif/core';

import { Incident } from '../../global.type';
import {
  closeIncidentIssue,
  createIncidentIssue,
  getAssigneeFromCustomProperties,
  reopenIncidentIssue,
  searchForIssues,
} from '../../utils/github/index.js';
import {
  processIncidentFromMessage,
  processIncidentFromTestReport,
} from '../../utils/incidents/index.js';
import {
  getWorksheetByName,
  updateServiceRow,
} from '../../utils/spreadsheet/index.js';

class JahiaGitHubIncident extends Command {
  static description = 'Handles the creation of issues when incidents arise';

  static flags = {
    dryRun: Flags.boolean({
      default: false,
      description: 'Do not send the data but only print it to console',
    }),
    forceSuccess: Flags.boolean({
      default: false,
      description:
        'If provided, will force the failure count to 0, disrespective of the actual failure in the reports',
    }),
    githubCustomPropertyName: Flags.string({
      default: 'Champion',
      description:
        'Name of a repository custom property to use for assignee lookup (e.g. Champion)',
      env: 'GITHUB_CUSTOM_PROPERTY_NAME',
    }),
    githubIssueLabel: Flags.string({
      default: '',
      description: 'GitHub issue label to apply',
      env: 'GITHUB_ISSUE_LABEL',
    }),
    githubRepository: Flags.string({
      default: '',
      description:
        'GitHub repository where issue is/should be located (e.g. owner/repo)',
    }),
    githubToken: Flags.string({
      default: '',
      description: 'GitHub token used for authentication',
      env: 'GITHUB_TOKEN',
    }),
    googleApiKey: Flags.string({
      default: '',
      description:
        'Google Client API key required to access the spreadsheet (base64)',
      env: 'INCIDENT_GOOGLE_PRIVATE_KEY_BASE64',
    }),
    googleClientEmail: Flags.string({
      default: '',
      description: 'Google Client email required to access the spreadsheet',
      env: 'INCIDENT_GOOGLE_CLIENT_EMAIL',
    }),
    googleSpreadsheetId: Flags.string({
      default: '',
      description:
        'ID of the spreadsheet container user assignment for the service',
      env: 'INCIDENT_GOOGLE_SPREADSHEET_ID',
    }),
    googleUpdateState: Flags.boolean({
      default: false,
      description:
        'Update the State column to PASSED/FAILED based on the outcome of the tests',
    }),
    googleWorksheetName: Flags.string({
      default: 'Pagerduty',
      description: 'Name of the worksheet to use within the Spreadsheet',
    }),
    incidentDetailsPath: Flags.string({
      default: '',
      description:
        'A file containing the details about the incident, this get copied into the issue description',
    }),
    incidentMessage: Flags.string({
      default: '',
      description:
        'A string containing a short incident message, this is used to generate the dedup key when a such message cannot be obtained from a test report',
    }),
    incidentService: Flags.string({
      default: '',
      description: 'A string used to identify a unique incident service',
    }),
    sourcePath: Flags.string({
      default: '',
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
    }),
    sourceType: Flags.string({
      char: 't', // shorter flag version
      default: 'xml',
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json', 'json-perf'], // only allow the value to be from a discrete set
    }),
    sourceUrl: Flags.string({
      default: '',
      description: 'URL back to the service who initiated the incident',
    }),
    version: Flags.version({ char: 'v' }),
  };

  async run() {
    const { flags } = await this.parse(JahiaGitHubIncident);

    // Begin by collecting as much data as possible about the trigger
    // There are two main type of triggers
    // - Those associated with a test report
    // - Those associated with a workflow event (for example the failure of a workflow step -- such as in the performance tests) for which there are no test reports
    // Will fit their output into a common format to simplify the issue creation/update process

    let incidentContent: Incident | undefined;

    incidentContent = await (flags.sourcePath === ''
      ? processIncidentFromMessage({
          incidentDetailsPath: flags.incidentDetailsPath,
          message: flags.incidentMessage,
          service: flags.incidentService,
        })
      : processIncidentFromTestReport({
          log: this.log.bind(this),
          service: flags.incidentService,
          sourcePath: flags.sourcePath,
          sourceType: flags.sourceType,
        }));

    if (flags.sourceUrl !== '') {
      incidentContent.sourceUrl = flags.sourceUrl;
    }

    if (flags.forceSuccess) {
      this.log(
        `The script has been forced to success, the actual failure found was: ${incidentContent.counts.fail} failures out of ${incidentContent.counts.total} tests`,
      );
      incidentContent = {
        ...incidentContent,
        counts: {
          ...incidentContent.counts,
          fail: 0,
          total: 0,
        },
      };
    }

    // Updated Status in Google Spreadsheet and collect data about assignee
    if (flags.googleSpreadsheetId === '') {
      this.log('Google Spreadsheet ID has not been set, exiting.');
      this.exit(0);
    }

    this.log(`Google Spreadsheet ID is set to: ${flags.googleSpreadsheetId}`);
    const gWorksheet = await getWorksheetByName(
      {
        googleApiKey: flags.googleApiKey || '',
        googleClientEmail: flags.googleClientEmail || '',
        googleSpreadsheetId: flags.googleSpreadsheetId,
        googleWorksheetName: flags.googleWorksheetName,
      },
      this.log.bind(this),
    );
    const serviceRow = await updateServiceRow(
      gWorksheet,
      flags.incidentService,
      incidentContent,
      this.log.bind(this),
    );

    let assignee = serviceRow.get('PagerDuty User ID') || '';
    if (assignee === `[$${flags.githubCustomPropertyName}]`) {
      this.log(
        `Assignee is set to [${flags.githubCustomPropertyName}], its value will be fetched from the repository custom properties (${flags.githubCustomPropertyName} field)`,
      );
      assignee = await getAssigneeFromCustomProperties({
        githubToken: flags.githubToken,
        propertyName: flags.githubCustomPropertyName,
        repository: flags.githubRepository,
      });
    }

    if (assignee === '') {
      this.log(
        `Unable to find assignee for service ${flags.incidentService}, the process will exit.`,
      );
      this.exit(0);
    }

    if (
      serviceRow.get('PagerDuty Enabled') !== undefined &&
      serviceRow.get('PagerDuty Enabled').toLowerCase() === 'no'
    ) {
      this.log(
        'Notifications are disabled for this service (Column: PagerDuty Enabled), the process will exit.',
      );
      this.exit(0);
    }

    // Updating the incident object with the assignee
    incidentContent = {
      ...incidentContent,
      assignee,
    };

    this.log('Incident Content:');
    console.log(incidentContent);

    this.log('Starting GitHub Incident creation process');
    // Begin by searching for all issues matching the provided incident service
    const issues = await searchForIssues(
      flags.githubToken,
      flags.githubRepository,
      flags.incidentService,
    );
    this.log(
      `Found ${issues.length} issues for service ${flags.incidentService}`,
    );

    // If no issue exists, and if failures are present, create a new issue
    if (issues.length === 0 && incidentContent.counts.fail > 0) {
      this.log(`No issues found for service ${flags.incidentService}`);
      await createIncidentIssue({
        githubToken: flags.githubToken,
        incidentContent,
        issueLabel: flags.githubIssueLabel,
        log: this.log.bind(this),
        repository: flags.githubRepository,
      });
    } else {
      this.log(
        `Total number of existing issues for service ${flags.incidentService}: ${issues.length}`,
      );
      if (incidentContent.counts.fail === 0) {
        const openedIssues = issues.filter((i) => i.state === 'OPEN');
        if (openedIssues.length === 0) {
          this.log(
            `No open issues found for service ${flags.incidentService}, nothing to be done.`,
          );
        } else {
          this.log(
            `Found ${openedIssues.length} open issues for service ${flags.incidentService}, will proceed to close them.`,
          );
          for (const issue of openedIssues) {
            // eslint-disable-next-line no-await-in-loop
            await closeIncidentIssue({
              githubToken: flags.githubToken,
              incidentContent,
              issue,
              log: this.log.bind(this),
            });
          }
        }
      } else if (incidentContent.counts.fail > 0) {
        // If tests are failing and issues exist, we need to determine if they need to be re-opened or if a new issue is required
        // We are onlky re-opening one issue per dedup key
        const matchingIssues = issues.filter(
          (i) =>
            i.state === 'CLOSED' && i.body.includes(incidentContent?.dedupKey),
        );
        this.log(
          `Number of issues CLOSED referencing dedupKey ${incidentContent?.dedupKey}: ${matchingIssues.length}`,
        );

        if (matchingIssues.length > 0) {
          // sort matching issues by createdAt
          matchingIssues.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          this.log(
            `Re-opening the most recent issue for dedupKey ${incidentContent?.dedupKey} - ${matchingIssues[0].url}`,
          );

          await reopenIncidentIssue({
            githubToken: flags.githubToken,
            incidentContent,
            issue: matchingIssues[0],
            log: this.log.bind(this),
          });
        }
      }
    }
  }
}

export default JahiaGitHubIncident;
