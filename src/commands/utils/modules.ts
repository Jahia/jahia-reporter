import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import * as path from 'path'

import {UtilsVersions, UtilsPlatform} from '../../global.type'

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
  }

  async run() {
    const {flags} = this.parse(JahiaUtilsModule)

    const dependencies: string[] = flags.dependencies.split(',')

    const jahiaFullUrl = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'
    const version: UtilsVersions = getModules(flags.moduleId, dependencies, jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)
    const platform: UtilsPlatform | undefined = getPlatform(jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)

    fs.writeFileSync(
      path.join(flags.filepath),
      JSON.stringify({...version, platform: platform})
    )
  }
}

export = JahiaUtilsModule
