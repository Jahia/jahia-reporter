import {Command, flags} from '@oclif/command'
import {performance} from 'perf_hooks'
import * as fs from 'fs'

import installModule from '../../utils/install-module'
import uninstallModule from '../../utils/uninstall-module'
import {getModules} from '../../utils/modules'

class JahiaUtilsModule extends Command {
  static description = 'Install a module and remove any previous installed version of that module'

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    jahiaUrl: flags.string({
      description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/)',
      default: 'http://localhost:8080/',
    }),
    jahiaUsername: flags.string({
      description: 'Jahia username used to authenticated with the remote endpoint',
      default: 'root',
    }),
    jahiaPassword: flags.string({
      description: 'Jahia password used to authenticated with the remote endpoint',
      default: 'root',
    }),
    moduleId: flags.string({
      description: 'Module ID of the module currently being tested',
      required: true,
    }),
    moduleFile: flags.string({
      description: 'Specify the filepath to the module to be installed (jar on filesystem)',
      required: true,
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaUtilsModule)
    const t0 = performance.now()

    if (!fs.existsSync(flags.moduleFile)) {
      this.log('ERROR: Unable to access file: ' + flags.moduleFile)
      this.exit(1)
    }

    const jahiaFullUrl = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'

    this.log('Get list of installed modules')
    let installedModules = await getModules(flags.moduleId, [], jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)
    let installMod: Array<{id: string}> = installedModules.allModules.filter((m: { id: string}) => m.id === flags.moduleId)
    if (installMod.length > 0) {
      this.log(`A version of this module is already installed: ${JSON.stringify(installMod)}`)
    } else {
      this.log(`No previous versions of module ${flags.moduleId} detected on the system`)
    }

    const install: any = await installModule(jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword, flags.moduleFile)
    if (install.length > 0) {
      this.log(`Module succesfully submitted for installation, response: ${JSON.stringify(install[0])}`)
      installedModules = await getModules(flags.moduleId, [], jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)

      // There might be occurences during which the installation of a newer version of a module doesn't uninstall a previous version and this might cause some issues (i.e. with graphql-dxm-provider)
      // So we first inatll the module, then look for any previously version that might still be present, then uninstall these previous version.
      // For some obscure reasons, the version returned by module manager is different from the version returned by the install payload (. instead of -)
      // Stripping all non-alphanumerical characters for the comparison
      const otherVersionsSameModule = installedModules.allModules.filter((m: { id: string; version: string }) => m.id === flags.moduleId && m.version.replace(/[^0-9a-z]/gi, '') !== install[0].version.replace(/[^0-9a-z]/gi, ''))
      if (otherVersionsSameModule.length > 0) {
        this.log('A previous version of this module is on the system, it will be removed')
        this.log(JSON.stringify(otherVersionsSameModule))
        for (const otherMod of otherVersionsSameModule) {
          this.log(`Removal of module: ${JSON.stringify(otherMod)}`)
          // eslint-disable-next-line no-await-in-loop
          const uninstall: any = await uninstallModule(jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword, otherMod.id, otherMod.version)
          this.log('The following module was uninstalled: ')
          this.log(JSON.stringify(uninstall))
        }
      }
    }

    installedModules = await getModules(flags.moduleId, [], jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword)
    installMod = installedModules.allModules.filter((m: { id: string}) => m.id === flags.moduleId)
    this.log(`The following versions of the module are installed: ${JSON.stringify(installMod)}`)

    const t1 = performance.now()
    this.log('Total Execution time: ' + Math.round(t1 - t0) + ' milliseconds.')
  }
}

export = JahiaUtilsModule
