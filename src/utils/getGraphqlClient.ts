import { Client, fetchExchange } from '@urql/core';
import { graphql } from 'gql.tada';
import { Base64 } from 'js-base64';

// Verify that the provided credentials are valid by querying the current user
// and checking that the username matches the expected one
const isConnectionValid = async (
  client: Client,
  username: string,
): Promise<boolean> => {
  const response = await client.query(
    graphql(`
      query {
        currentUser {
          username
        }
      }
    `),
    {},
  );

  if (!response.data || response.data.currentUser === null) {
    throw new Error(
      `Authentication failed: Unable to authenticate with the provided credentials. Error: ${response.error?.message || JSON.stringify(response.error)}`,
    );
  }

  if (response.data.currentUser.username !== username) {
    throw new Error(
      `Authentication failed: Authenticated user "${response.data.currentUser.username}" does not match expected username "${username}"`,
    );
  }

  return true;
};

export const getGraphqlClient = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  skipConnectionCheck: boolean = false,
): Promise<Client> => {
  // Create a client object to be reused for each call
  const authHeader = `Basic ${Base64.btoa(
    jahiaUsername + ':' + jahiaPassword,
  )}`;

  // If a trailing slash is present, we remove it, this make the variable usable in both url and Origin
  const normalizedUrl = jahiaUrl.endsWith('/')
    ? jahiaUrl.slice(0, -1)
    : jahiaUrl;

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
  });

  // The skipConnectionCheck flag can be used in scenarios where the connection
  // validation is not required or should be skipped (e.g., while waiting
  // for Jahia to become available when using the SAM check
  if (skipConnectionCheck) {
    return client;
  }

  const checkConnection = await isConnectionValid(client, jahiaUsername);

  if (!checkConnection) {
    throw new Error(
      'Authentication failed: Unable to authenticate with the provided credentials',
    );
  }

  return client;
};
