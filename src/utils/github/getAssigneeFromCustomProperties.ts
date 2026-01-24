import { Octokit } from 'octokit';

// This retrieves an assignee from the custom repository properties
// At the time of writing this method, only REST API supports repository custom properties
export const getAssigneeFromCustomProperties = async ({
  githubToken,
  propertyName = 'Champion',
  repository,
}: {
  githubToken: string;
  propertyName?: string;
  repository: string;
}): Promise<string> => {
  const octokit = new Octokit({
    auth: githubToken,
  });

  const [owner, repo] = repository.split('/');
  const properties = await octokit.request(
    'GET /repos/{owner}/{repo}/properties/values',
    {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
      owner,
      repo,
    },
  );

  let assignee: string = '';
  for (const property of properties.data) {
    if (
      property.property_name === propertyName &&
      typeof property.value === 'string'
    ) {
      assignee = property.value;
      break;
    }
  }

  return assignee;
};
