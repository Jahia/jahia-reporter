import {Client, fetchExchange} from '@urql/core'
import {graphql} from 'gql.tada'
import {Base64} from 'js-base64'

export const getGraphqlClient = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
): Promise<Client> => {
  // Create a client object to be reused for each call
  const authHeader = `Basic ${Base64.btoa(
    jahiaUsername + ':' + jahiaPassword,
  )}`

  // If a trailing slash is present, we remove it, this make the variable usable in both url and Origin
  const normalizedUrl = jahiaUrl.endsWith('/')
    ? jahiaUrl.slice(0, -1)
    : jahiaUrl

  const client = new Client({
    exchanges: [fetchExchange],
    fetchOptions: {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Origin: normalizedUrl,
      },
    },
    url: normalizedUrl + '/modules/graphql',
  })

  // Basic test of the connection
  const response = await client.query(
    graphql(`
      query {
        currentUser {
          username
        }
      }
    `),
    {},
  )

  if (!response.data || response.data.currentUser === null) {
    throw new Error(
      'Authentication failed: Unable to authenticate with the provided credentials',
    )
  }

  return client
}
