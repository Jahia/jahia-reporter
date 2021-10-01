import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'
import {readFileSync} from 'fs'

import {PerfNode} from '@bit/zencrepes.zindexer.testing-perfs'

import * as crypto from 'crypto'

class JahiaPerfsReporter extends Command {
  static description = 'Submit data about a junit/mocha report to ZenCrepes'

  static flags = {
    help: flags.help({char: 'h'}),
    filepath: flags.string({
      description: 'A json file containing the perf report, this must match the schema',
      required: true,
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

    const rawFile = readFileSync(flags.filepath, 'utf8')
    const zcPayload: PerfNode = JSON.parse(rawFile.toString())

    // Prepare the payload signature, is used by ZenCrepes (zqueue)
    // to ensure submitted is authorized
    const hmac = crypto.createHmac('sha1', flags.webhookSecret)
    const digest = Buffer.from(
      'sha1=' + hmac.update(JSON.stringify(zcPayload)).digest('hex'),
      'utf8',
    )
    const xHubSignature = digest.toString()

    this.log(JSON.stringify(zcPayload))

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

export = JahiaPerfsReporter
