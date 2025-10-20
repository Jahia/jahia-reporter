import {Octokit} from '@octokit/core'

export const getAssigneeFromCustomProperties = async (
  githubToken: string,
  repository: string,
  propertyName: string = 'Champion',
): Promise<string> => {
  const octokit = new Octokit({
    auth: githubToken,
  })

  const [owner, repo] = repository.split('/')
  const properties = await octokit.request(
    'GET /repos/{owner}/{repo}/properties/values',
    {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
      owner,
      repo,
    },
  )

  let assignee: string = ''
  for (const property of properties.data) {
    if (
      property.property_name === propertyName
      && typeof property.value === 'string'
    ) {
      assignee = property.value
      break
    }
  }

  return assignee
}
