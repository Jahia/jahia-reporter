/* eslint max-depth: ["error", 5] */
import { Command, Flags } from '@oclif/core';
import { v5 as uuidv5 } from 'uuid';
import * as fs from 'node:fs';

import { searchForIssues } from '../../utils/github/searchForIssues.js';
import ingestReport from '../../utils/ingest/index.js';
import { JRRun, Incident } from '../../global.type';
import { processIncidentFromTestReport } from '../../utils/incidents/processIncidentFromTestReport.js';
import { processIncidentFromMessage } from '../../utils/incidents/processIncidentFromMessage.js';

const buildDefaultIssueDescription = ({
  service,
  incidentMessage,
  dedupKey,
  incidentDetails,
  runUrl,
}: {
  service: string;
  incidentMessage: string;
  dedupKey: string;
  incidentDetails: string;
  runUrl?: string;
}): string => {
  let description = 'An error occurred during the test execution workflow.\n\n';

  if (incidentDetails && incidentDetails !== '') {
    description += `**Details:**\n\n${incidentDetails}\n\n\n`;
    return description;
  } else {
    description +=
      'No test output is available, please look into the provided link below or the repository workflows \n\n';
  }

  // Add custom incident message if provided
  if (incidentMessage) {
    description += `**Details:** ${incidentMessage}\n\n\n`;
  }

  // Add source URL if provided
  if (runUrl) {
    description += `**Source URL:** ${runUrl}\n`;
  }

  // Add incident service context
  if (service) {
    description += `**Service:** ${service}\n`;
  }

  // Add custom incident message if provided
  if (dedupKey) {
    description += `**Dedup Key:** ${dedupKey}\n`;
  }

  return description;
};

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
    githubRepository: Flags.string({
      default: '',
      description:
        'GitHub repository where issue is/should be located (e.g. owner/repo)',
    }),
    githubToken: Flags.string({
      default: '',
      env: 'GITHUB_TOKEN',
      description: 'GitHub token used for authentication',
    }),
    incidentService: Flags.string({
      default: '',
      description: 'A string used to identify a unique incident service',
    }),
    incidentMessage: Flags.string({
      default: '',
      description:
        'A string containing a short incident message, this is used to generate the dedup key when a such message cannot be obtained from a test report',
    }),
    incidentDetailsPath: Flags.string({
      default: '',
      description:
        'A file containing the details about the incident, this get copied into the issue description',
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
    version: Flags.version({ char: 'v' }),
  };

  // eslint-disable-next-line complexity
  async run() {
    const { flags } = await this.parse(JahiaGitHubIncident);

    // Begin by collecting as much data as possible about the trigger
    // There are two main type of triggers
    // - Those associated with a test report
    // - Those associated with a workflow event (for example the failure of a workflow step -- such as in the performance tests) for which there are no test reports
    // Will fit their output into a common format to simplify the issue creation/update process

    let incidentContent: Incident | undefined;

    if (flags.sourcePath !== '') {
      incidentContent = await processIncidentFromTestReport({
        sourceType: flags.sourceType,
        sourcePath: flags.sourcePath,
        service: flags.incidentService,
        log: this.log.bind(this),
      });
    } else {
      incidentContent = await processIncidentFromMessage({
        service: flags.incidentService,
        message: flags.incidentMessage,
        incidentDetailsPath: flags.incidentDetailsPath,
      });
    }

    console.log(incidentContent);

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

    console.log(incidentContent);

    this.exit(0);

    console.log('Starting GitHub Incident creation process');
    // Begin by searching for all issues matching the provided incident service
    const issues = await searchForIssues(
      flags.githubToken,
      flags.githubRepository,
      flags.incidentService,
    );
    console.log(
      `Found ${issues.length} issues for service ${flags.incidentService}`,
    );

    // Set default values for key elements
    let dedupKey = uuidv5(
      'Unable to access reports',
      '92ca6951-5785-4d62-9f33-3512aaa91a9b',
    );

    let incidentDetails = '';
    if (fs.existsSync(flags.incidentDetailsPath)) {
      console.log(
        `Reading incident details from file: ${flags.incidentDetailsPath}`,
      );
      incidentDetails = fs.readFileSync(flags.incidentDetailsPath, 'utf8');
    } else {
      const jrRun: JRRun = await ingestReport(
        flags.sourceType,
        flags.sourcePath,
        this.log.bind(this),
      );
    }

    let incidentTitle = `${flags.service} - Incident during test execution`;
    let incidentDescription = buildDefaultIssueDescription({
      service: flags.incidentService,
      incidentMessage: flags.incidentMessage,
      dedupKey,
      incidentDetails,
      runUrl: flags.runUrl,
    });

    console.log(incidentDescription);

    if (flags.incidentMessage && flags.incidentMessage !== '') {
      incidentTitle = `${flags.service} - ${flags.incidentMessage}`;
      dedupKey = uuidv5(
        flags.incidentMessage,
        '92ca6951-5785-4d62-9f33-3512aaa91a9b',
      );
    }
    // Determine the dedup key
    // This key is a unique representation of what the current failure actually is
    // If the run was successful and an open issue is found matching this incident service and dedup key, it will get closed automatically with a comment
    // The comment will contain a link to the run that resolved the incident
  }
}

export default JahiaGitHubIncident;
