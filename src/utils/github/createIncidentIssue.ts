import { Octokit } from 'octokit';

import { Incident } from '../../types/index.js';

const buildDefaultIssueDescription = ({
  dedupKey,
  description,
  service,
  sourceUrl,
}: {
  dedupKey: string;
  description: string;
  service: string;
  sourceUrl?: string;
}): string => {
  let body = 'An error occurred during the execution of a CI/CD workflow.\n\n';

  if (description && description !== '') {
    body += '### Failure Details';
    body += `\n\n \`\`\`\n${description}\n\`\`\``;
  } else {
    body +=
      'No test output is available, please look into the provided link below or the repository workflows \n\n';
  }

  // Add incident service context
  if (service) {
    body += `\n\n**Service:** ${service}`;
  }

  body += `\n**Date:** ${new Date().toISOString()}`;
  // Add source URL if provided
  if (sourceUrl) {
    body += `\n**Source URL:** ${sourceUrl}`;
  }

  // Add custom incident message if provided
  if (dedupKey) {
    body += `\n**Dedup Key:** ${dedupKey}`;
  }

  body += `\n\n
<details>\n
<summary>Expand to learn more about these issues</summary>\n\n

### About\n\n

This issue was created by [jahia-reporter](https://github.com/Jahia/jahia-reporter) by an automated CI/CD workflow (see link above). 
Using a "Dedup key", the tool will identify similar failure for a particular service.\n\n

The following logic is present:\n
- A successful run for a service will close **ALL** open issues for that service for **ALL** dedup keys\n
- Updates are not posted if the status did not change (i.e. two subsequent failures only results in one single issue or single comment).\n
- A previously closed issues will be re-opened if it starts failing again.\n\n

The Dedup key is generated from the list of failed test cases sorted alphabetically. \n\n

</details>\n\n
`;

  return body;
};

export const createIncidentIssue = async ({
  githubToken,
  incidentContent,
  issueLabel,
  log,
  repository,
}: {
  githubToken: string;
  incidentContent: Incident;
  issueLabel: string;
  log: (message: string) => void;
  repository: string;
}) => {
  const octokit = new Octokit({ auth: githubToken });

  const [owner, repo] = repository.split('/');

  const payload = {
    assignees: [incidentContent.assignee],
    body: buildDefaultIssueDescription({
      dedupKey: incidentContent.dedupKey,
      description: incidentContent.description,
      service: incidentContent.service,
      sourceUrl: incidentContent.sourceUrl,
    }),
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
    labels: [issueLabel],
    owner,
    repo,
    title: incidentContent.title,
  };

  log(`Creating issue: ${JSON.stringify(payload, null, 2)}`);
  const response = await octokit.request(
    'POST /repos/{owner}/{repo}/issues',
    payload,
  );

  log(`Created issue: ${response.data.html_url}`);

  return response.data;
};
