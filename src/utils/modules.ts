import {SyncRequestClient} from 'ts-sync-request/dist'
import {Base64} from 'js-base64'

import {JahiaModule} from '../global.type'

export const getJahiaVersion = (version: string) => {
  if (version === 'UNKNOWN') {
    return {
      fullVersion: 'UNKNOWN',
      version: 'UNKNOWN',
      build: 'UNKNOWN',
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
    fullVersion: version,
    version: jahiaVersion,
    build: jahiaBuild,
  }
}

const parseModuleManagerData = (response: any) => {
  const instanceModules: any = Object.values(response)[0]
  const modules = []
  const regExp = new RegExp(/org\.jahia\.modules\/(.*)\/(.*)/)

  const instanceModulesArr: Array<any> = Object.entries(instanceModules)
  for (const [key, value] of instanceModulesArr) {
    const ex = regExp.exec(key)
    if (ex !== null) {
      modules.push({...value, id: ex[1], version: ex[2], name: ex[1]})
    }
  }
  return modules
}

// eslint-disable-next-line max-params
export const getModules = (moduleId: string, dependencies: string[], jahiaUrl: string, jahiaUsername: string, jahiaPassword: string) => {
  const authHeader = `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`

  // Simple graphql call to fetch the query
  let response: any = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('authorization', authHeader)
  .post(jahiaUrl + 'modules/graphql', {query: 'query { admin { version } dashboard { modules { id name version } } }'})

  if (response.errors !== undefined) {
    // There might be cases in which the admin node is not installed (older version of graphql-dxm-provider)
    // In that case, we re-run the query without the admin node
    response = new SyncRequestClient()
    .addHeader('Content-Type', 'application/json')
    .addHeader('authorization', authHeader)
    .post(jahiaUrl + 'modules/graphql', {query: 'query { dashboard { modules { id name version } } }'})
  }

  // Jahia 8 with the GraphQL dashboard node available
  if (response.data !== null) {
    const module = response.data.dashboard.modules.find((m: JahiaModule) => m.id === moduleId)

    return {
      jahia: response.data.admin === undefined ? getJahiaVersion('UNKNOWN') : getJahiaVersion(response.data.admin.version),
      module: module === undefined ? {
        id: moduleId,
        name: 'UNKNOWN',
        version: 'UNKNOWN',
      } : module,
      dependencies: dependencies
      .map((d: string) => response.data.dashboard.modules.find((m: {id: string}) => m.id === d))
      .filter((d: {id: string} | undefined) => d !== undefined),
      allModules: response.data.dashboard.modules.sort(function (a: {id: string}, b: {id: string}) {
        if (a.id < b.id) {
          return -1
        }
        if (a.id > b.id) {
          return 1
        }
        return 0
      }),
    }
  }

  // If GraphQL Dashboard node is not available, falling back to the module manager REST API
  response = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('authorization', authHeader)
  .get(jahiaUrl + 'modules/api/bundles/org.jahia.modules/*/*/_info')

  if (Object.values(response).length > 0) {
    const modules: any = parseModuleManagerData(response)
    const module = modules.find((m: JahiaModule) => m.id === moduleId)
    return {
      jahia: getJahiaVersion('UNKNOWN'),
      module: module === undefined ? {
        id: moduleId,
        name: 'UNKNOWN',
        version: 'UNKNOWN',
      } : module,
      dependencies: dependencies
      .map((d: string) => modules.find((m: {id: string}) => m.id === d))
      .filter((d: {id: string} | undefined) => d !== undefined),
      allModules: modules.sort(function (a: {id: string}, b: {id: string}) {
        if (a.id < b.id) {
          return -1
        }
        if (a.id > b.id) {
          return 1
        }
        return 0
      }),
    }
  }

  // Othwerise return empty data
  return {
    jahia: getJahiaVersion('UNKNOWN'),
    module: {
      id: moduleId,
      name: 'UNKNOWN',
      version: 'UNKNOWN',
    },
    dependencies: [],
    allModules: [],
  }
}
