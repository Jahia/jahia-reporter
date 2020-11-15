import {Command, flags} from '@oclif/command'
import * as fs from 'fs'
import * as path from 'path'

import {UtilsVersions} from '../../global.type'

import {getModules} from '../../utils/modules'

class JahiaUtilsModule extends Command {
  static description = 'For a provided module, returns the module version, Jahia version and list of installed modules'

  static args = [
    {name: 'jahiaUrl',
      required: true,
      description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/modules/graphql)',
      default: 'http://localhost:8080/modules/graphql'},
    {name: 'jahiaUsername',
      required: true,
      description: 'Jahia username'},
    {name: 'jahiaPassword',
      required: true,
      description: 'Jahia password'},
  ]

  static flags = {
    // add --version flag to show CLI version
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
    module: flags.string({
      char: 'm',
      description: 'Module ID',
      required: true,
    }),
    dependencies: flags.string({
      char: 'd',
      description: 'Comma separated list of module ID dependencies',
      default: '',
    }),
    filepath: flags.string({
      char: 'f',
      description: 'Filepath to store the resulting JSON to',
      required: true,
    }),
  }

  async run() {
    const {args, flags} = this.parse(JahiaUtilsModule)

    const dependencies: string[] = flags.dependencies.split(',')

    const version: UtilsVersions = getModules(flags.module, dependencies, args.jahiaUrl, args.jahiaUsername, args.jahiaPassword)

    fs.writeFileSync(
      path.join(flags.filepath),
      JSON.stringify(version)
    )
  }
}

export = JahiaUtilsModule
