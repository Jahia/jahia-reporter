import { Client } from '@urql/core';
import { graphql } from 'gql.tada';

import { sleep } from './sleep.js';

const getJournalStatus = graphql(`
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
`);

export const waitForJournalSync = async (
  timeout: number,
  client: Client,
): Promise<void> => {
  for (let i = 0; i < timeout; i++) {
    const response = await client.query(getJournalStatus, {});

    // Exit early if cluster is not activated (no sync needed)
    if (response.data === null) {
      return;
    }

    if (
      response.data?.admin?.cluster?.isActivated === undefined ||
      response.data?.admin?.cluster?.isActivated === false
    ) {
      return;
    }

    // Exit if cluster is activated and in sync
    if (
      response.data?.admin?.cluster?.journal?.isClusterSync === true &&
      response.data?.admin?.cluster?.isActivated === true
    ) {
      return;
    }

    // Wait before next check
    await sleep(1000);
  }
};
