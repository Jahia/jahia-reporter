import { Command, Flags } from '@oclif/core';

import { GitHubProject, Incident } from '../../types/index.js';
import {
  addIssueToProject,
  closeIncidentIssue,
  createIncidentIssue,
  getAssigneeFromCustomProperties,
  getProjectByNumber,
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
      default: 'automated-incident',
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

  // eslint-disable-next-line complexity
  async run() {
    const { flags } = await this.parse(JahiaGitHubIncident);
    this.log(`About to process test run for service: ${flags.incidentService}`);

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

    // Fetch the service row matching the incident service
    // If it does not find a matching row, it will create a new one for that service
    const serviceRow = await updateServiceRow({
      incidentContent,
      log: this.log.bind(this),
      repository: flags.githubRepository,
      service: flags.incidentService,
      worksheet: gWorksheet,
    });

    // Exit if notifications are disabled
    if (
      serviceRow.get('Enable Notifications') !== undefined &&
      serviceRow.get('Enable Notifications').toLowerCase() === 'no'
    ) {
      this.log(
        'Notifications are disabled for this service (Column: Enable Notifications), the process will exit.',
      );
      this.exit(0);
    }

    let assignee = serviceRow.get('Assignee') || '';
    if (assignee === `[${flags.githubCustomPropertyName}]`) {
      this.log(
        `Assignee is set to [${flags.githubCustomPropertyName}], its value will be fetched from the repository custom properties (${flags.githubCustomPropertyName} field)`,
      );
      assignee = await getAssigneeFromCustomProperties({
        githubToken: flags.githubToken,
        propertyName: flags.githubCustomPropertyName,
        repository: flags.githubRepository,
      });
      this.log(
        `Assignee fetched from repository custom properties: ${assignee}`,
      );
    }

    // Exit if assignee cannot be found
    if (assignee === '') {
      this.log(
        `No assignee set for the service ${flags.incidentService} in the corresponding row, the process will exit (state was: ${incidentContent.counts.fail > 0 ? 'FAILED' : 'PASSED'}).`,
      );
      this.exit(0);
    }

    // If a GitHub Project is specified, we retrieve its configuration for
    // assigning the issue to:
    // - A project Team
    // - A Project Status
    // - A Project Priority
    let githubProject: GitHubProject | null = null;
    if (
      serviceRow.get('Project Number') !== undefined &&
      Number.parseInt(serviceRow.get('Project Number'), 10) > 0
    ) {
      const projectOrg = flags.githubRepository.split('/')[0];
      // A GitHub project is specified in the column, meaning we have to fetch its data
      githubProject = await getProjectByNumber({
        githubToken: flags.githubToken,
        log: this.log.bind(this),
        projectNumber: Number.parseInt(serviceRow.get('Project Number'), 10),
        projectOrg,
      });
    }

    // Updating the incident object with the assignee
    // At that point, the assignee must be a valid GitHub username
    incidentContent = {
      ...incidentContent,
      assignee,
    };

    this.log('Incident Content:');
    console.log(incidentContent);

    this.log('Starting GitHub Incident creation process');
    // Begin by searching for/retrieving all issues matching the provided incident service
    // We will want to find any existing issues (including closed issues) with the same dedup key
    let issues = await searchForIssues(
      flags.githubToken,
      flags.githubRepository,
      flags.incidentService,
    );
    this.log(
      `Found ${issues.length} issues for service ${flags.incidentService}`,
    );

    // Filter down to only issues created by Jahia Reporter
    // Only keeping issues containing the "Dedup Key" string
    // This to avoid getting in the list issues unrelated to incidents
    issues = issues.filter((i) => i.body && i.body.includes('Dedup Key'));

    let currentIssue = null;
    if (issues.length === 0) {
      if (incidentContent.counts.fail > 0) {
        // If no issue exists, and if failures are present, create a new issue
        this.log(
          `No existing issues found for service ${flags.incidentService}, creating a new one`,
        );
        currentIssue = await createIncidentIssue({
          githubToken: flags.githubToken,
          incidentContent,
          issueLabel: flags.githubIssueLabel,
          log: this.log.bind(this),
          repository: flags.githubRepository,
        });
      }
    } else {
      this.log(
        `Total number of existing issues for service ${flags.incidentService}: ${issues.length}`,
      );
      if (incidentContent.counts.fail === 0) {
        // If there are no failures, any open issues will be closed
        // The dedup key is not relevant at that point
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
        // We are only re-opening one issue per dedup key
        const matchingIssues = issues.filter((i) =>
          i.body.includes(incidentContent?.dedupKey),
        );
        this.log(
          `Number of issues referencing dedupKey ${incidentContent?.dedupKey}: ${matchingIssues.length}`,
        );

        const openIssues = issues.filter((i) => i.state === 'OPEN');

        // const matchingOpenIssues = matchingIssues.filter(
        //   (i) => i.state === 'OPEN',
        // );
        if (openIssues.length > 0 && openIssues[0].state === 'OPEN') {
          // An issue is already open for that service key, no issue to be created or re-opened
          this.log(
            `An issue is already OPEN for service ${flags.incidentService} - ${openIssues[0].url}, nothing to be done.`,
          );
          // Setting it to null to indicate no changes should be made (such as changing the project status)
          currentIssue = null;
          // } else if (
          //   matchingOpenIssues.length > 0 &&
          //   matchingOpenIssues[0].state === 'OPEN'
          // ) {
          //   // An issue is already open for that dedup key, no issue to be created or re-opened
          //   this.log(
          //     `An issue is already OPEN for dedupKey ${incidentContent?.dedupKey} - ${matchingOpenIssues[0].url}, nothing to be done.`,
          //   );
          //   // Setting it to null to indicate no changes should be made (such as changing the project status)
          //   currentIssue = null;
        } else if (matchingIssues.length > 0) {
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

          currentIssue = matchingIssues[0];
        } else {
          this.log(
            `No matching closed issues found for dedupKey ${incidentContent?.dedupKey}, creating a new issue`,
          );
          currentIssue = await createIncidentIssue({
            githubToken: flags.githubToken,
            incidentContent,
            issueLabel: flags.githubIssueLabel,
            log: this.log.bind(this),
            repository: flags.githubRepository,
          });
        }
      }
    }

    // If currentIssue is not null, this means:
    //  - A new issue was created
    //  - An issues was reopened
    // then we know the issue should be added to a project as per the
    // configuration in the spreadsheet
    // If an issue was already open, we don't modify its status
    if (currentIssue !== null && githubProject !== null) {
      const githubProjectStatus = serviceRow.get('Project Status');
      const githubProjectTeam = serviceRow.get('Project Team');
      const githubProjectPriority = serviceRow.get('Project Priority');
      await addIssueToProject({
        githubProject,
        githubProjectPriority,
        githubProjectStatus,
        githubProjectTeam,
        githubToken: flags.githubToken,
        issue: currentIssue,
        log: this.log.bind(this),
      });
    }
  }
}

export default JahiaGitHubIncident;
