import {Command, flags} from '@oclif/command'
import {performance} from 'node:perf_hooks'

import waitAlive from '../../utils/wait-alive'

class JahiaUtilsAlive extends Command {
  static description = 'Indefinitely waits until a Jahia instance becomes available'

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
    timeout: flags.string({
      required: false,
      char: 't',
      description:
        'Specify a timeout after which the process will exit with an error',
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaUtilsAlive)
    const t0 = performance.now()

    let timeout =
      flags.timeout === undefined ?
        0 :
        Math.round(Number.parseInt(flags.timeout, 10) * 1000)
    if (timeout === 0) {
      timeout = 300_000 // By default timeout, if specified, is a minimum of 300 seconds (5 minutes)
    }

    const jahiaFullUrl = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'

    await waitAlive(jahiaFullUrl, flags.jahiaUsername, flags.jahiaPassword, timeout)

    const t1 = performance.now()
    this.log(
      'Total Exceution time: ' + Math.round(t1 - t0) + ' milliseconds.',
    )
  }
}

export = JahiaUtilsAlive
