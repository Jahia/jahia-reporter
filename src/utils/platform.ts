import {Base64} from 'js-base64'
import {SyncRequestClient} from 'ts-sync-request/dist/index.js'

export const getPlatform = (jahiaUrl: string, jahiaUsername: string, jahiaPassword: string) => {
  const authHeader = `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`

  // Simple graphql call to fetch the query
  let response: any = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('referer', jahiaUrl)
  .addHeader('authorization', authHeader)
  .post(jahiaUrl + 'modules/graphql', {query: '{admin{jahia{version{build buildDate isSnapshot release}database{type name version driverName driverVersion}system{os{name architecture version}java{runtimeName runtimeVersion vendor vendorVersion}}}cluster{isActivated}}}'})

  if (response.data !== null && response.errors === undefined) {
    console.log('Fetched full details about the platform')
    return response.data.admin
  }

  console.log('Unable to execute the full GraphQL query to get platform details')

  console.log(JSON.stringify(response.errors))

  // If there was an error, get only the jahia version. This part of the API
  response = new SyncRequestClient()
  .addHeader('Content-Type', 'application/json')
  .addHeader('referer', jahiaUrl)
  .addHeader('authorization', authHeader)
  .post(jahiaUrl + 'modules/graphql', {query: '{admin{jahia{version{build buildDate isSnapshot release}}}}'})

  if (response.data !== null && response.errors === undefined) {
    console.log('Fetched partial details about the platform')
    return response.data.admin
  }

  console.log('Unable to execute the simplified GraphQL query to get platform details')

  console.log(JSON.stringify(response.errors))

  // Othwerise return empty data
  return {
    jahia: {
      version: {
        build: 'UNKNOWN',
        buildDate: 'UNKNOWN',
        isSnapshot: 'UNKNOWN',
        release: 'UNKNOWN',
      },
    },
  }
}
