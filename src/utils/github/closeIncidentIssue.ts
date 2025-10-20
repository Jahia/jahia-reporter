import {Octokit} from '@octokit/core'

import {GitHubIssue, Incident} from '../../global.type'

export const closeIncidentIssue = async (
  githubToken: string,
  issue: GitHubIssue,
  incidentContent: Incident,
  log: any,
): Promise<any> => {
  const octokit = new Octokit({auth: githubToken})

  log(`Issue #${issue.number} will be closed (${issue.url}`)

  let commentBody
    = '✅ A CI/CD workflow has completed successfully, closing the issue.'
  commentBody += `\n\n\n **Details:**\n\n \`\`\`\n${incidentContent.description}\n\`\`\``
  commentBody += `\n\n**Date:** ${new Date().toISOString()}`
  commentBody += `\n**Source URL:** ${incidentContent.sourceUrl}`

  const closeReason = 'COMPLETED' // or NOT_PLANNED | null

  const query = `
    mutation ($issueId: ID!, $comment: String!, $reason: IssueClosedStateReason) {
      addComment(input: { subjectId: $issueId, body: $comment }) {
        clientMutationId
      }
      closeIssue(input: { issueId: $issueId, stateReason: $reason }) {
        clientMutationId
      }
    }
  `

  const response = await octokit.graphql(query, {
    comment: commentBody,
    issueId: issue.id,
    reason: closeReason,
  })

  return response
}
