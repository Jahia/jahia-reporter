import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'
import {readFileSync} from 'fs'
import * as gh from 'parse-github-url'
import * as loadYamlFile from 'load-yaml-file'
import * as fs from 'fs'

import * as crypto from 'crypto'

class JahiaPerfsReporter extends Command {
  static description = 'Submit data about a junit/mocha report to ZenCrepes'

  static flags = {
    help: flags.help({char: 'h'}),
    runsFile: flags.string({
      description: 'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    tfsettingsFile: flags.string({
      description: 'A Terraform tfsettings file',
      required: true,
    }),
    runName: flags.string({
      description: 'Name of the run',
      required: true,
    }),
    repoUrl: flags.string({
      description: 'Name of the run',
      required: true,
    }),
    runUrl: flags.string({
      description: 'URL of the run',
      required: false,
      default: '',
    }),    
    webhook: flags.string({
      description: 'The Webhook URL to send the payload to',
      required: true,
    }),
    webhookSecret: flags.string({
      description: 'The webhook secret',
      required: true,
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaPerfsReporter)

    let jMeterRuns = {}
    if (fs.existsSync(flags.runsFile)) {
      const rawFile = readFileSync(flags.runsFile, 'utf8')
      jMeterRuns = JSON.parse(rawFile.toString())
    } else {
      this.log(`Unable to read runsFile at: ${flags.runsFile}`)
      this.exit(1)
    }

    let tfsettings: any = {}
    if (fs.existsSync(flags.tfsettingsFile)) {
      tfsettings = await loadYamlFile(flags.tfsettingsFile)
    } else {
      this.log(`Unable to read tfsettingsFile at: ${flags.tfsettingsFile}`)
      this.exit(1)
    }

    const ghObj = gh(flags.repoUrl)
    if (ghObj === null) {
      this.log(`Unable to parse repo url: ${flags.repoUrl}`)
      this.exit(1)
    } else {
      const resources = Object.entries(tfsettings.docker_containers)
      const zcPayload: any = {
        name: flags.runName,
        repository: {
          name: ghObj.name,
          url: flags.repoUrl,
          owner: {
            login: ghObj.owner,
            url: 'https://github.com/' + ghObj.owner,
          },
        },
        platform: {
          vendor: 'AWS',
          tenant: 'jahia-sandbox',
          region: tfsettings.aws_region,
        },
        resources: resources.map((r: any) => {
          return {
            name: r[1].name,
            size: r[1].ec2_instance_type,
            image: r[1].image,
            tfsettings: JSON.stringify(r[1]),
          }
        }),
        url: flags.runUrl,
        ...jMeterRuns,
      }

      // Prepare the payload signature, is used by ZenCrepes (zqueue)
      // to ensure submitted is authorized
      const hmac = crypto.createHmac('sha1', flags.webhookSecret)
      const digest = Buffer.from(
        'sha1=' + hmac.update(JSON.stringify(zcPayload)).digest('hex'),
        'utf8',
      )
      const xHubSignature = digest.toString()

      this.log(zcPayload)

      try {
        new SyncRequestClient()
        .addHeader('x-hub-signature', xHubSignature)
        .addHeader('Content-Type', 'application/json')
        .post(flags.webhook, zcPayload)
      } catch (error) {
        this.log('ERROR: Unable to submit data to ZenCrepes')
        this.log(JSON.stringify(error))
      }
    }
  }
}

export = JahiaPerfsReporter
