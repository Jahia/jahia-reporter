import {SyncRequestClient} from 'ts-sync-request/dist'
import {Base64} from 'js-base64'
import {sleep} from './sleep'

export const waitForJournalSync = (timeout: number, jahiaUrl: string, jahiaUsername: string, jahiaPassword: string) => {
  for (let i = 0; i < timeout; i++) {
    const response: any = new SyncRequestClient()
    .addHeader('Content-Type', 'application/json')
    .addHeader('referer', jahiaUrl)
    .addHeader('authorization', `Basic ${Base64.btoa(jahiaUsername + ':' + jahiaPassword)}`)
    .post(jahiaUrl + 'modules/graphql', {query: 'query { admin { cluster { journal { globalRevision localRevision { revision serverId } revisions { revision serverId } isClusterSync } isActivated } }}'})
    if (response.errors !== undefined) break
    if (response.data === null) break
    if (response.data.admin.cluster.journal === 'null') break
    if (response.data.admin.cluster.isActivated === undefined || response.data.admin.cluster.isActivated === 'false') break
    if (response.data.admin.cluster.journal.isClusterSync === 'true' && response.data.cluster.isActivated === 'true') break
    
    sleep(1000)
  }
}
