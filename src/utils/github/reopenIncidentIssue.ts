import {Octokit} from '@octokit/core'

import {GitHubIssue, Incident} from '../../global.type'

export const reopenIncidentIssue = async (
  githubToken: string,
  issue: GitHubIssue,
  incidentContent: Incident,
  log: any,
): Promise<any> => {
  const octokit = new Octokit({auth: githubToken})

  log(`Issue #${issue.number} will be Re-opened (${issue.url}`)

  let commentBody
    = '❌ A CI/CD workflow run with the same dedup key has failed, re-opening the issue.'
  commentBody += `\n\n\n **Details:**\n\n \`\`\`\n${incidentContent.description}\n\`\`\``
  commentBody += `\n\n**Date:** ${new Date().toISOString()}`
  commentBody += `\n**Source URL:** ${incidentContent.sourceUrl}`

  const closeReason = 'COMPLETED' // or NOT_PLANNED | null

  const query = `
    mutation ($issueId: ID!, $comment: String!) {
      addComment(input: { subjectId: $issueId, body: $comment }) {
        clientMutationId
      }
      reopenIssue(input: { issueId: $issueId }) {
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
