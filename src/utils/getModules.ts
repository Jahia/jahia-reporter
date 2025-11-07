import { Client } from '@urql/core';
import { graphql } from 'gql.tada';

import { JahiaModule } from '../global.type';

// Retrieves the list of modules installed on the JJahia instance along with the Jahia version
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
    // Find the module details corresponding to moduleId
    const module = response.data.dashboard.modules.find(
      (m: JahiaModule) => m.id === moduleId,
    );

    // A sorted array of all modules on the platforms
    const allModules = response.data.dashboard.modules.sort(
      (a: JahiaModule, b: JahiaModule) => a.id.localeCompare(b.id),
    );

    // An array of the dependencies provided in input
    const allDependencies = dependencies
      .map((d: string) =>
        response.data.dashboard.modules.find((m: JahiaModule) => m.id === d),
      )
      .filter((d: JahiaModule | undefined) => d !== undefined) as JahiaModule[];

    return {
      allModules,
      dependencies: allDependencies,
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

  // Return empty object if something went wrong
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
