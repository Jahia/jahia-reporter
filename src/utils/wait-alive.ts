import {ux} from '@oclif/core'
import {SyncRequestClient, SyncRequestOptions} from 'ts-sync-request/dist'
import {performance} from 'perf_hooks'
import {Base64} from 'js-base64'

import {sleep} from './sleep'

const isAlive = (data: unknown): boolean => {
  // eslint-disable-next-line no-console
  console.log(`API response: ${JSON.stringify((data as {data?: unknown}).data)}`)
  const responseData = (data as {data?: {jcr?: {workspace?: string}}}).data
  if (responseData === undefined || responseData === null || responseData.jcr?.workspace !== 'EDIT') {
    return false
  }
  return true
}

const gqlQuery = `
    query {
        jcr(workspace: EDIT) {
            workspace
        }
    }
`

const checkStatus = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  timeout: number, // in ms
  timeSinceStart: number, // in ms
// eslint-disable-next-line max-params
): Promise<unknown> => {
  const currentTime = new Date()
  // eslint-disable-next-line no-console
  console.log(`${currentTime.toISOString()} - Time since start: ${timeSinceStart} ms`)
  let data: unknown = {}

  if (timeSinceStart < timeout) {
    const callStart = performance.now()
    try {
      const authHeader = `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`
      const options: SyncRequestOptions = {
        followRedirects: true,
        maxRedirects: 1000,
        timeout: true,
        retry: false,
        retryDelay: 200,
        maxRetries: 5,
      }
      data = new SyncRequestClient(options)
      .addHeader('Content-Type', 'application/json')
      .addHeader('authorization', authHeader)
      .post(jahiaUrl + 'modules/graphql', {query: gqlQuery})
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(String(error))
    }
    if (isAlive(data) === false) {
      await sleep(2000)
      const callDuration = performance.now() - callStart
      const time = Math.round(timeSinceStart + callDuration)
      data = await checkStatus(jahiaUrl, jahiaUsername, jahiaPassword, timeout, time)
    }
  }

  return data
}

const waitAlive = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  timeout: number): Promise<boolean> => {
  ux.action.start('Waiting for Jahia to be online')
  const data = await checkStatus(jahiaUrl, jahiaUsername, jahiaPassword, timeout, 0)
  if (isAlive(data) === false) {
    // eslint-disable-next-line no-console
    console.log(
      'ERROR: Unable to validate alive state, most likely expired timeout',
    )
    process.exit(1)
  }
  return true
}

export default waitAlive
