import { Octokit } from 'octokit';

export const getProjectByNumber = async ({
  githubToken,
  log,
  projectNumber,
  projectOrg,
}: {
  githubToken: string;
  log: (message: string) => void;
  projectNumber: number;
  projectOrg: string;
}): Promise<void> => {
  const octokit = new Octokit({ auth: githubToken });

  log(
    `Fetching project data for project number: ${projectNumber} in org: ${projectOrg}`,
  );

  const query = `
    query ($projectNumber: Int!, $projectOrg: String!) {
      organization(login: $projectOrg) {
        projectV2(number: $projectNumber) {
          id
          title
          url
          status: field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
          teams: field(name: "Team") {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
          priorities: field(name: "Priority") {
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }            
        }
      }
    }
  `;

  const response = await octokit.graphql(query, {
    projectNumber,
    projectOrg,
  });

  log(`Project data fetched successfully: ${JSON.stringify(response)}`);

  return response.organization.projectV2;
};
