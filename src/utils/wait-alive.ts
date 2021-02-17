import cli from 'cli-ux'
import {SyncRequestClient} from 'ts-sync-request/dist'
import {exit} from '@oclif/errors'
import {performance} from 'perf_hooks'
import {Base64} from 'js-base64'

import {sleep} from './sleep'

const isAlive = (data: any) => {
  if (data.data === undefined || data.data.jcr.workspace !== 'EDIT') {
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
) => {
  // eslint-disable-next-line no-console
  console.log('Time since start: ' + timeSinceStart + 'ms')
  let data: any = {}

  if (timeSinceStart < timeout) {
    try {
      const authHeader = `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`

      data = new SyncRequestClient()
      .addHeader('Content-Type', 'application/json')
      .addHeader('authorization', authHeader)
      .post(jahiaUrl + 'modules/graphql', {query: gqlQuery})
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error.message)
    }
    const time = Math.round(timeSinceStart + performance.now())
    if (isAlive(data) === false) {
      await sleep(2000)
      data = await checkStatus(jahiaUrl, jahiaUsername, jahiaPassword, timeout, time)
    }
  }

  return data
}

const waitAlive = async (
  jahiaUrl: string,
  jahiaUsername: string,
  jahiaPassword: string,
  timeout: number) => {
  cli.action.start('Waiting for Jahia to be online')
  const data = await checkStatus(jahiaUrl, jahiaUsername, jahiaPassword, timeout, 0)
  if (isAlive(data) === false) {
    // eslint-disable-next-line no-console
    console.log(
      'ERROR: Unable to validate alive state, most likely expired timeout',
    )
    exit()
  }
  return true
}

export default waitAlive