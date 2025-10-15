import { ux } from '@oclif/core';
import { Base64 } from 'js-base64';
import { performance } from 'node:perf_hooks';

import { Client, fetchExchange } from '@urql/core';
import { graphql } from 'gql.tada';

import { sleep } from './sleep.js';

const isAlive = (data: unknown): boolean => {
  if (
    data === undefined ||
    data === null ||
    typeof data !== 'object' ||
    !data ||
    !('jcr' in data) ||
    (data as any).jcr?.workspace !== 'EDIT'
  ) {
    return false;
  }

  return true;
};

const checkStatus = async (
  client: Client,
  timeout: number, // in ms
  timeSinceStart: number, // in ms
): Promise<unknown> => {
  const currentTime = new Date();

  console.log(
    `${currentTime.toISOString()} - Time since start: ${timeSinceStart} ms`,
  );
  let data: unknown = {};

  if (timeSinceStart < timeout) {
    const callStart = performance.now();

    const response = await client.query(
      graphql(`
        query {
          jcr(workspace: EDIT) {
            workspace
          }
        }
      `),
      {},
    );

    data = response.data;

    if (isAlive(data) === false) {
      await sleep(2000);
      const callDuration = performance.now() - callStart;
      const time = Math.round(timeSinceStart + callDuration);
      data = await checkStatus(client, timeout, time);
    }
  }

  return data;
};

const waitAlive = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  timeout: number,
): Promise<boolean> => {
  const startTime = performance.now();
  ux.action.start('Waiting for Jahia to be online');

  // Create a client object to be reused for each call
  const authHeader = `Basic ${Base64.btoa(
    jahiaUsername + ':' + jahiaPassword,
  )}`;

  // If a trailing slash is present, we remove it, this make the variable usable in both url and Origin
  const normalizedUrl = jahiaUrl.endsWith('/')
    ? jahiaUrl.slice(0, -1)
    : jahiaUrl;

  const client = new Client({
    url: normalizedUrl + '/modules/graphql',
    exchanges: [fetchExchange],
    fetchOptions: {
      headers: {
        'Content-Type': 'application/json',
        Origin: normalizedUrl,
        Authorization: authHeader,
      },
    },
  });

  const data = await checkStatus(client, timeout, 0);
  if (isAlive(data) === false) {
    console.log(
      'ERROR: Unable to validate alive state, most likely expired timeout',
    );
    process.exit(1);
  }

  const duration = Math.round(performance.now() - startTime);
  ux.action.stop(`Jahia became reachable after ${duration} ms`);

  return true;
};

export default waitAlive;
