import {Command, Flags} from '@oclif/core'
import axios from 'axios'
import * as fs from 'node:fs'
import {performance} from 'node:perf_hooks'

class JahiaUtilsProvision extends Command {
  static description
    = 'Provisions Jahia by sending a manifest (see Jahia provisioning API)'

  static flags = {
    help: Flags.help({char: 'h'}),
    jahiaPassword: Flags.string({
      default: 'root',
      description:
        'Jahia password used to authenticated with the remote endpoint)',
    }),
    jahiaUrl: Flags.string({
      default: 'http://localhost:8080/',
      description: 'Jahia GraphQL endpoint (i.e. http://localhost:8080/)',
    }),
    jahiaUsername: Flags.string({
      default: 'root',
      description:
        'Jahia username used to authenticated with the remote endpoint)',
    }),
    script: Flags.string({
      description: 'Specify the filepath to the script to be pushed',
      required: true,
    }),
    type: Flags.string({
      default: 'YAML',
      description: 'Filetype of the script (YAML or JSON)',
    }),
    version: Flags.version({char: 'v'}),
  }

  async run() {
    const {flags} = await this.parse(JahiaUtilsProvision)
    const t0 = performance.now()

    if (!fs.existsSync(flags.script)) {
      this.log(`ERROR: Unable to access file: ${flags.script}`)
      this.exit(1)
    }

    const scriptContent = await fs.readFileSync(flags.script)
    const jahiaFullUrl
      = flags.jahiaUrl.slice(-1) === '/' ? flags.jahiaUrl : flags.jahiaUrl + '/'

    this.log(`Submitting provisioning script located in: ${flags.script}`)
    let submissionResponse: any = {}
    try {
      submissionResponse = await axios.post(
        jahiaFullUrl + 'modules/api/provisioning',
        scriptContent,
        {
          auth: {
            password: flags.jahiaPassword,
            username: flags.jahiaUsername,
          },
          headers: {
            'Content-Type':
              flags.type === 'YAML' ? 'application/yaml' : 'application/json',
          },
          maxBodyLength: Number.POSITIVE_INFINITY,
          maxContentLength: Number.POSITIVE_INFINITY,
        },
      )
    } catch (error: any) {
      this.log('Error while submitting script')
      this.log(error)
      this.exit(1)
    }

    this.log(
      `Submission successful, response code: ${submissionResponse.status}`,
    )
    this.log(submissionResponse.statusText)
    const t1 = performance.now()
    this.log('Total Exceution time: ' + Math.round(t1 - t0) + ' milliseconds.')
  }
}

export default JahiaUtilsProvision
