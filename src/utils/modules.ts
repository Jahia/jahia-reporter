import {SyncRequestClient} from 'ts-sync-request/dist'
import {Base64} from 'js-base64'

import {UtilsVersions, JahiaModule} from '../global.type'

export const getJahiaVersion = (version: string) => {
  if (version === 'UNKOWN') {
    return {
      fullVersion: 'UNKOWN',
      version: 'UNKOWN',
      build: 'UNKOWN',
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

// eslint-disable-next-line max-params
export const getModules = (moduleId: string, dependencies: string[], jahiaUrl: string, jahiaUsername: string, jahiaPassword: string) => {
  const authHeader = `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`

  // Simple graphql call to fetch the query
  let response: any = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('authorization', authHeader)
  .post(jahiaUrl, {query: 'query { admin { version } dashboard { modules { id name version } } }'})

  if (response.errors !== undefined) {
    // There might be cases in which the admin node is not installed (older version of graphql-dxm-provider)
    // In that case, we re-run the query without the admin node
    response = new SyncRequestClient()
    .addHeader('Content-Type', 'application/json')
    .addHeader('authorization', authHeader)

    .post(jahiaUrl, {query: 'query { dashboard { modules { id name version } } }'})
  }

  // console.log(response.data);
  // console.log(response.data.dashboard.modules)
  const module = response.data.dashboard.modules.find((m: JahiaModule) => m.id === moduleId)

  const version: UtilsVersions = {
    jahia: response.data.admin === undefined ? getJahiaVersion('UNKNOWN') : getJahiaVersion(response.data.admin.version),
    module: module === undefined ? {
      id: moduleId,
      name: 'UNKNOWN',
      version: 'UNKOWN',
    } : module,
    dependencies: dependencies
    .map((d: string) => response.data.dashboard.modules.find((m: {id: string}) => m.id === d))
    .filter((d: {id: string} | undefined) => d !== undefined),
    allModules: response.data.dashboard.modules,
  }
  return version
}
