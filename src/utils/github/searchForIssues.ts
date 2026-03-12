import { Octokit } from 'octokit';

// Using GitHub GraphQL API to search for issues in a repository matching a search string
export const searchForIssues = async (
  githubToken: string,
  repository: string,
  searchString: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => {
  const octokit = new Octokit({ auth: githubToken });

  const query = `
    query($searchQuery: String!, $cursor: String) {
      search(query: $searchQuery, type: ISSUE, first: 100, after: $cursor) {
        edges {
          node {
            ... on Issue {
              id
              number
              title
              body
              state
              url
              createdAt
              updatedAt
              closedAt
              author {
                login
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const searchQuery = `repo:${repository} ${searchString}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchPage = async (cursor?: string): Promise<any[]> => {
    const response = await octokit.graphql(query, {
      cursor,
      searchQuery,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { edges, pageInfo } = (response as any).search;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues = edges.map((edge: any) => edge.node);

    return pageInfo.hasNextPage
      ? [...issues, ...(await fetchPage(pageInfo.endCursor))]
      : issues;
  };

  return fetchPage();
};
