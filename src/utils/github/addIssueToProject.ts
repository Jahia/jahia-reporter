import { Octokit } from 'octokit';

import { GitHubIssue } from '../../types/index.js';
import { sleep } from '../sleep.js';

// Update the status of a project card
const updateCardStatus = async ({
  githubToken,
  log,
  projectCardId,
  projectFieldId,
  projectId,
  projectValueId,
}: {
  githubToken: string;
  log: (message: string) => void;
  projectCardId: string;
  projectFieldId: string;
  projectId: string;
  projectValueId: string;
}) => {
  const octokit = new Octokit({ auth: githubToken });

  log(
    `Updating card ID: ${projectCardId} and field ID ${projectFieldId} with value ID: ${projectValueId}`,
  );

  const query = `
    mutation UpdateProjectField($projectId: ID!, $projectCardId: ID!, $projectFieldId: ID!, $projectValueId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $projectCardId
        fieldId: $projectFieldId
        value: {
          singleSelectOptionId: $projectValueId
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;

  const response = await octokit.graphql(query, {
    projectCardId,
    projectFieldId,
    projectId,
    projectValueId,
  });

  log(
    `Updated card ID: ${projectCardId} response: ${JSON.stringify(response)}`,
  );
};

// Adds an issue to a GitHub project and sets its fields
// This includes an hardcoded logic specifically sets three fields: status, team, priority
export const addIssueToProject = async ({
  githubProject,
  githubProjectPriority,
  githubProjectStatus,
  githubProjectTeam,
  githubToken,
  issue,
  log,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  githubProject: any;
  githubProjectPriority: string;
  githubProjectStatus: string;
  githubProjectTeam: string;
  githubToken: string;
  issue: GitHubIssue;
  log: (message: string) => void;
}): Promise<void> => {
  const octokit = new Octokit({ auth: githubToken });

  log(`Adding issue #${issue.number} to the project (${githubProject.url})`);

  const contentId = issue.node_id === undefined ? issue.id : issue.node_id;

  const query = `
    mutation AddIssueToProject($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {
        projectId: $projectId
        contentId: $contentId
      }) {
        item {
          id
        }
      }
    }
  `;

  const response = await octokit.graphql(query, {
    contentId,
    projectId: githubProject.id,
  });

  const projectCardId = response.addProjectV2ItemById.item.id;

  log(`Issue added to project, project card ID is: ${projectCardId}`);

  // Adding a sleep to give time for project data to be updated by GitHub
  // Otherwise, a workflow might kick off and overwrite our changes
  log(`Sleeping for 5 seconds to allow GitHub to update project data...`);
  await sleep(5000);

  // Handle project status
  const projectStatus = githubProject.status.options.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (option: any) => option.name === githubProjectStatus,
  );

  if (projectStatus) {
    log(
      `Card: ${projectCardId} will be updated to Status: ${projectStatus.name}`,
    );
    await updateCardStatus({
      githubToken,
      log,
      projectCardId,
      projectFieldId: githubProject.status.id,
      projectId: githubProject.id,
      projectValueId: projectStatus.id,
    });
  } else {
    log(
      `Could not find the desired status: ${githubProjectStatus} in project ${githubProject.url}`,
    );
  }

  // Handle project team
  const projectTeam = githubProject.teams.options.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (option: any) => option.name === githubProjectTeam,
  );

  if (projectTeam) {
    log(`Card: ${projectCardId} will be updated to Team: ${projectTeam.name}`);
    await updateCardStatus({
      githubToken,
      log,
      projectCardId,
      projectFieldId: githubProject.teams.id,
      projectId: githubProject.id,
      projectValueId: projectTeam.id,
    });
  } else {
    log(
      `Could not find the desired team: ${githubProjectTeam} in project ${githubProject.url}`,
    );
  }

  // Handle project priority
  const projectPriority = githubProject.priorities.options.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (option: any) => option.name === githubProjectPriority,
  );

  if (projectPriority) {
    log(
      `Card: ${projectCardId} will be updated to Priority: ${projectPriority.name}`,
    );
    await updateCardStatus({
      githubToken,
      log,
      projectCardId,
      projectFieldId: githubProject.priorities.id,
      projectId: githubProject.id,
      projectValueId: projectPriority.id,
    });
  } else {
    log(
      `Could not find the desired priority: ${githubProjectPriority} in project ${githubProject.url}`,
    );
  }

  return response;
};
