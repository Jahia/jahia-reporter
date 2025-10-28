import { Client } from '@urql/core';
import { graphql } from 'gql.tada';

import { sleep } from './sleep.js';

export const waitForJournalSync = (timeout: number, client: Client) => {
  let isJournalSync: boolean = false;

  for (let i = 0; i < timeout; i++) {
    client
      .query(
        graphql(`
          query {
            admin {
              cluster {
                journal {
                  globalRevision
                  localRevision {
                    revision
                    serverId
                  }
                  revisions {
                    revision
                    serverId
                  }
                  isClusterSync
                }
                isActivated
              }
            }
          }
        `),
        {},
      )
      .then((response) => {
        if (response.data === null) isJournalSync = true;
        if (
          response.data?.admin?.cluster?.isActivated === undefined ||
          response.data?.admin?.cluster?.isActivated === false
        )
          isJournalSync = true;
        if (
          response.data?.admin?.cluster?.journal?.isClusterSync === true &&
          response.data?.admin?.cluster?.isActivated === true
        )
          isJournalSync = true;
      });
    if (isJournalSync) {
      break;
    }

    sleep(1000);
  }
};
