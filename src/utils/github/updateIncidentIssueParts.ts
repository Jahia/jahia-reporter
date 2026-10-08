import { Octokit } from 'octokit';

import { Incident } from '../../types/index.js';
import { writeFailingParts } from '../incidents/failingParts.js';

// Records the parts currently failing in the issue body and, when given, posts a comment saying
// which part changed. The issue stays open: closing it is closeIncidentIssue's job.
export const updateIncidentIssueParts = async ({
  comment,
  githubToken,
  incidentContent,
  issue,
  log,
  parts,
  repository,
}: {
  comment?: string;
  githubToken: string;
  incidentContent: Incident;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  issue: any;
  log: (message: string) => void;
  parts: string[];
  repository: string;
}): Promise<void> => {
  const octokit = new Octokit({ auth: githubToken });
  const [owner, repo] = repository.split('/');

  log(
    `Issue #${issue.number} failing parts: ${parts.length > 0 ? parts.join(', ') : '(none)'} (${issue.url})`,
  );

  await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    body: writeFailingParts(issue.body, parts),
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
    issue_number: issue.number,
    owner,
    repo,
  });

  if (comment) {
    let commentBody = comment;
    commentBody += `\n\n**Still failing:** ${parts.length > 0 ? parts.join(', ') : '(none)'}`;
    commentBody += `\n\n\n **Details:**\n\n \`\`\`\n${incidentContent.description}\n\`\`\``;
    commentBody += `\n\n**Date:** ${new Date().toISOString()}`;
    commentBody += `\n**Source URL:** ${incidentContent.sourceUrl}`;

    await octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        body: commentBody,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
        },
        issue_number: issue.number,
        owner,
        repo,
      },
    );
  }
};
