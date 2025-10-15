import {Base64} from 'js-base64'
import {SyncRequestClient} from 'ts-sync-request/dist/index.js'

import {JahiaModule} from '../global.type'

export const getJahiaVersion = (version: string) => {
  if (version === 'UNKNOWN') {
    return {
      build: 'UNKNOWN',
      fullVersion: 'UNKNOWN',
      version: 'UNKNOWN',
    }
  }

  let jahiaBuild = ''
  const findBuild = version.match(/Build (.*)/)
  if (findBuild !== null) {
    jahiaBuild = findBuild[1]
  }

  let jahiaVersion = 'UNKNOWN'
  let findVersion = version.match(/Jahia (.*) \[/)
  if (findVersion !== null) {
    jahiaVersion = findVersion[1]
  }

  if (jahiaVersion === 'UNKNOWN') {
    findVersion = version.match(/Jahia (.*) -/)
    if (findVersion !== null) {
      jahiaVersion = findVersion[1]
    }
  }

  return {
    build: jahiaBuild,
    fullVersion: version,
    version: jahiaVersion,
  }
}

const parseModuleManagerData = (response: any) => {
  const instanceModules: any = Object.values(response)[0]
  const modules = []
  const regExp = /.*\/(.*)\/(.*)/
  const instanceModulesArr: Array<any> = Object.entries(instanceModules)
  for (const [key, value] of instanceModulesArr) {
    const ex = regExp.exec(key)
    if (ex !== null) {
      modules.push({
        ...value,
        id: ex[1],
        name: ex[1],
        version: ex[2],
      })
    }
  }

  return modules
}

export const getModules = (
  moduleId: string,
  dependencies: string[],
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
) => {
  const authHeader = `Basic ${Base64.btoa(
    jahiaUsername + ':' + jahiaPassword,
  )}`

  // Simple graphql call to fetch the query
  let response: any = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('referer', jahiaUrl)
  .addHeader('authorization', authHeader)
  .post(jahiaUrl + 'modules/graphql', {
    query:
        'query { admin { version } dashboard { modules { id name version } } }',
  })

  if (response.errors !== undefined) {
    // There might be cases in which the admin node is not installed (older version of graphql-dxm-provider)
    // In that case, we re-run the query without the admin node

    console.log(JSON.stringify(response.errors))
    response = new SyncRequestClient()
    .addHeader('Content-Type', 'application/json')
    .addHeader('referer', jahiaUrl)
    .addHeader('authorization', authHeader)
    .post(jahiaUrl + 'modules/graphql', {
      query: 'query { dashboard { modules { id name version } } }',
    })
  }

  if (response.errors !== undefined) {
    console.log(JSON.stringify(response.errors))
  }

  // Jahia 8 with the GraphQL dashboard node available
  if (response.data !== null && response.errors === undefined) {
    const module = response.data.dashboard.modules.find(
      (m: JahiaModule) => m.id === moduleId,
    )

    return {
      allModules: response.data.dashboard.modules.sort(
        (a: { id: string }, b: { id: string }) => {
          if (a.id < b.id) {
            return -1
          }

          if (a.id > b.id) {
            return 1
          }

          return 0
        },
      ),
      dependencies: dependencies
      .map((d: string) =>
        response.data.dashboard.modules.find((m: JahiaModule) => m.id === d),
      )
      .filter(
        (d: JahiaModule | undefined) => d !== undefined,
      ) as JahiaModule[],
      jahia:
        response.data.admin === undefined
          ? getJahiaVersion('UNKNOWN')
          : getJahiaVersion(response.data.admin.version),
      module:
        module === undefined
          ? {
            id: moduleId,
            name: 'UNKNOWN',
            version: 'UNKNOWN',
          }
          : module,
    }
  }

  // If GraphQL Dashboard node is not available, falling back to the module manager REST API
  response = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('referer', jahiaUrl)
  .addHeader('authorization', authHeader)
  .get(jahiaUrl + 'modules/api/bundles/org.jahia.modules/*/*/_info')

  if (Object.values(response).length > 0) {
    const modules: any = parseModuleManagerData(response)
    const module = modules.find((m: JahiaModule) => m.id === moduleId)
    return {
      allModules: modules.sort((a: { id: string }, b: { id: string }) => {
        if (a.id < b.id) {
          return -1
        }

        if (a.id > b.id) {
          return 1
        }

        return 0
      }),
      dependencies: dependencies
      .map((d: string) => modules.find((m: JahiaModule) => m.id === d))
      .filter(
        (d: JahiaModule | undefined) => d !== undefined,
      ) as JahiaModule[],
      jahia: getJahiaVersion('UNKNOWN'),
      module:
        module === undefined
          ? {
            id: moduleId,
            name: 'UNKNOWN',
            version: 'UNKNOWN',
          }
          : module,
    }
  }

  // Othwerise return empty data
  return {
    allModules: [],
    dependencies: [],
    jahia: getJahiaVersion('UNKNOWN'),
    module: {
      id: moduleId,
      name: 'UNKNOWN',
      version: 'UNKNOWN',
    },
  }
}
