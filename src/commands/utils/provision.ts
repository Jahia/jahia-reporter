import {Command, flags} from '@oclif/command'
import {performance} from 'perf_hooks'
import * as fs from 'fs'
import axios from 'axios'

class JahiaUtilsProvision extends Command {
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
    script: flags.string({
      description: 'Specify the filepath to the script to be pushed',
      required: true,
    }),
    type: flags.string({
      description: 'Filetype of the script (YAML or JSON)',
      default: 'YAML',
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaUtilsProvision)
    const t0 = performance.now()

    if (!fs.existsSync(flags.script)) {
      this.log(`ERROR: Unable to access file: ${flags.script}`)
      this.exit(1)
    }

    const scriptContent = await fs.readFileSync(flags.script)
    const jahiaFullUrl = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'

    this.log(`Submitting provisioning script located in: ${flags.script}`)
    let submissionResponse: any = {}
    try {
      submissionResponse = await axios.post(jahiaFullUrl + 'modules/api/provisioning', scriptContent, {
        headers: {
          'Content-Type': flags.type === 'YAML' ? 'application/yaml' : 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        auth: {
          username: flags.jahiaUsername,
          password: flags.jahiaPassword,
        },
      })
    } catch (error) {
      this.log('Error while submitting script')
      this.log(error)
      this.exit(1)
    }

    this.log(`Submission successful, response code: ${submissionResponse.status}`)
    this.log(submissionResponse.statusText)
    const t1 = performance.now()
    this.log(
      'Total Exceution time: ' + Math.round(t1 - t0) + ' milliseconds.',
    )
  }
}

export = JahiaUtilsProvision
