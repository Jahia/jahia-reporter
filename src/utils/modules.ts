import { Client } from '@urql/core';
import { graphql } from 'gql.tada';

import { JahiaModule } from '../global.type';

export const getJahiaVersion = (version: string) => {
  if (version === 'UNKNOWN') {
    return {
      build: 'UNKNOWN',
      fullVersion: 'UNKNOWN',
      version: 'UNKNOWN',
    };
  }

  let jahiaBuild = '';
  const findBuild = version.match(/Build (.*)/);
  if (findBuild !== null) {
    jahiaBuild = findBuild[1];
  }

  let jahiaVersion = 'UNKNOWN';
  let findVersion = version.match(/Jahia (.*) \[/);
  if (findVersion !== null) {
    jahiaVersion = findVersion[1];
  }

  if (jahiaVersion === 'UNKNOWN') {
    findVersion = version.match(/Jahia (.*) -/);
    if (findVersion !== null) {
      jahiaVersion = findVersion[1];
    }
  }

  return {
    build: jahiaBuild,
    fullVersion: version,
    version: jahiaVersion,
  };
};

export const getModules = async (
  moduleId: string,
  dependencies: string[],
  client: Client,
) => {
  const response = await client.query(
    graphql(`
      query {
        admin {
          jahia {
            version {
              build
              buildDate
              release
              isSnapshot
            }
          }
        }
        dashboard {
          modules {
            id
            name
            version
          }
        }
      }
    `),
    {},
  );

  if (response.data !== null) {
    const module = response.data.dashboard.modules.find(
      (m: JahiaModule) => m.id === moduleId,
    );

    return {
      allModules: response.data.dashboard.modules.sort(
        (a: { id: string }, b: { id: string }) => {
          if (a.id < b.id) {
            return -1;
          }

          if (a.id > b.id) {
            return 1;
          }

          return 0;
        },
      ),
      dependencies: dependencies
        .map((d: string) =>
          response.data.dashboard.modules.find((m: JahiaModule) => m.id === d),
        )
        .filter(
          (d: JahiaModule | undefined) => d !== undefined,
        ) as JahiaModule[],
      jahia: response.data.admin.jahia.version,
      module:
        module === undefined
          ? {
              id: moduleId,
              name: 'UNKNOWN',
              version: 'UNKNOWN',
            }
          : module,
    };
  }

  return {
    allModules: [],
    dependencies: [],
    jahia: {
      build: 'UNKNOWN',
      fullVersion: 'UNKNOWN',
      version: 'UNKNOWN',
    },
    module: {
      id: moduleId,
      name: 'UNKNOWN',
      version: 'UNKNOWN',
    },
  };
};
