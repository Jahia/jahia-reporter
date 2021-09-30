import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'
import * as fs from 'fs'
import {lstatSync, readFileSync} from 'fs'

import { PerfNode } from '@bit/zencrepes.zindexer.testing-perfs'

import ingestReport from '../utils/ingest'
import {UtilsVersions} from '../global.type'

import * as crypto from 'crypto'
import {v5 as uuidv5} from 'uuid'

import {ZenCrepesStateNode, ZenCrepesDependency} from '../global.type'

const prepString = (s: string) => {
  return s.replace(/[^0-9a-zA-Z]/g, '').toLowerCase()
}

// This generate an unique id based on the combination the component and its dependencies
// The ID is simply a UUID genreated from the concatenation of all elements
// Note that the dependencies are sorted and all string are cleaned (lower case and stripped from non alphanumerical characters)
const getId = (name: string, version: string, dependencies: ZenCrepesDependency[]) => {
  let idStr = prepString(name) + prepString(version)

  dependencies.sort((a: ZenCrepesDependency, b: ZenCrepesDependency) => {
    // Sort by name
    if (a.name > b.name) return 1
    if (a.name < b.name) return -1
    // If names are equal, then sort by version
    if (a.version > b.version) return 1
    if (a.version < b.version) return -1
    return 0
  }).forEach((d: ZenCrepesDependency) => {
    idStr = idStr + prepString(d.name) + prepString(d.version)
  })

  const UUID_NAMESPACE = 'c72d8f12-1818-4cb9-bead-44634c441c11'
  return uuidv5(idStr, UUID_NAMESPACE)
}

class JahiaTestrailReporter extends Command {
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
    const {flags} = this.parse(JahiaTestrailReporter)

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

export = JahiaTestrailReporter
