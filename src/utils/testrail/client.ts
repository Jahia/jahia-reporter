import { SyncRequestClient } from 'ts-sync-request/dist/index.js';

import type { TestRailConfig } from '../../types/index.js';

// HTTP request functionality
export const sendRequest = (
  config: TestRailConfig,
  method: string,
  uri: string,
  data: object | string,
): unknown => {
  const url: string = config.url + uri;

  for (let i = 0; i < 5; i++) {
    try {
      if (method === 'GET') {
        return new SyncRequestClient()
          .addHeader('Authorization', 'Basic ' + config.encodedAuth)
          .addHeader('Content-Type', 'application/json')
          .get(url);
      }

      if (method === 'POST') {
        return new SyncRequestClient()
          .addHeader('Authorization', 'Basic ' + config.encodedAuth)
          .addHeader('Content-Type', 'application/json')
          .post(url, data);
      }
    } catch (error) {
      const err = error as { message?: string; statusCode?: number };
      if (err.statusCode === 429) {
        console.log(
          `Failed to send ${method} request to ${uri}. Maximum number of allowed API calls per minute reached. Waiting 90 seconds...`,
        );
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 90_000);
      } else {
        console.log(
          `Failed to send ${method} request to ${uri} with data ${JSON.stringify(
            data,
            null,
            4,
          )}:\n${err.message || String(error)}`,
        );
        const randomWait: number = Math.floor(Math.random() * 200);
        Atomics.wait(
          new Int32Array(new SharedArrayBuffer(4)),
          0,
          0,
          randomWait,
        );
      }
    }
  }

  return null;
};
