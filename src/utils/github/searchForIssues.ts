import {Octokit} from '@octokit/core'
import {paginateGraphQL} from '@octokit/plugin-paginate-graphql'

export const searchForIssues = async (
  githubToken: string,
  repository: string,
  searchString: string,
): Promise<any[]> => {
  const MyOctokit = Octokit.plugin(paginateGraphQL)
  const octokit = new MyOctokit({auth: githubToken})

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
  `

  const searchQuery = `repo:${repository} ${searchString}`

  const fetchPage = async (cursor?: string): Promise<any[]> => {
    const response = await octokit.graphql(query, {
      cursor,
      searchQuery,
    })

    const {edges, pageInfo} = (response as any).search
    const issues = edges.map((edge: any) => edge.node)

    return pageInfo.hasNextPage
      ? [...issues, ...(await fetchPage(pageInfo.endCursor))]
      : issues
  }

  return fetchPage()
}
