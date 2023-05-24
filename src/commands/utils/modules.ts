import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import * as path from 'path'

import {UtilsVersions, UtilsPlatform} from '../../global.type'

import {SyncRequestClient} from 'ts-sync-request/dist'
import {Base64} from 'js-base64'
import {getModules} from '../../utils/modules'
import {getPlatform} from '../../utils/platform'

class JahiaUtilsModule extends Command {
  static description = 'For a provided module, returns the module version, Jahia version and list of installed modules'

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    jahiaUrl: flags.string({
      description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/)',
      default: 'http://localhost:8080/',
    }),
    jahiaUsername: flags.string({
      description: 'Jahia username used to authenticated with the remote endpoint)',
      default: 'root',
    }),
    jahiaPassword: flags.string({
      description: 'Jahia password used to authenticated with the remote endpoint)',
      default: 'root',
    }),
    moduleId: flags.string({
      description: 'Module ID of the module currently being tested',
      required: true,
    }),
    dependencies: flags.string({
      description: 'Comma separated list of module ID dependencies',
      default: '',
    }),
    filepath: flags.string({
      description: 'Filepath to store the resulting JSON to',
      required: true,
    }),
    timeout: flags.integer({
      decription: 'Timeout for the provisioning script to end execution',
      default: 120,
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaUtilsModule)

    const dependencies: string[] = flags.dependencies.split(',')

    const jahiaFullUrl = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'
    for (let i = 0; i < flags.timeout; i++) {
      let out = false
      setTimeout(() => {
        const response: any = new SyncRequestClient()
        .addHeader('Content-Type', 'application/json')
        .addHeader('referer', flags.jahiaUrl)
        .addHeader('authorization', `Basic ${Base64.btoa(flags.jahiaUsername + ':' + flags.jahiaPassword)}`)
        .post(flags.jahiaUrl + 'modules/graphql', {query: 'query { admin { cluster { journal { globalRevision localRevision { revision serverId } revisions { revision serverId } isClusterSync } isActivated } }}'})
        if (response.errors !== undefined) out = true
        if (response.data !== null) {
          if (response.data.admin.cluster.journal.isClusterSync === true && response.data.cluster.isActivated === true) out = true
        }
      }, 1000);
      if (out) {
        break
      }
    }
    const version: UtilsVersions = getModules(flags.moduleId, dependencies, jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)
    const platform: UtilsPlatform | undefined = getPlatform(jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)

    fs.writeFileSync(
      path.join(flags.filepath),
      JSON.stringify({...version, platform: platform})
    )
  }
}

export = JahiaUtilsModule
