import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'

import ingestReport from '../utils/ingest'

import * as crypto from 'crypto'
import {v5 as uuidv5} from 'uuid'

import {StateNode, Dependency} from '@bit/zencrepes.zindexer.testing-states'

const prepString = (s: string) => {
  return s.replace(/[^0-9a-zA-Z]/g, '').toLowerCase()
}

// This generate an unique id based on the combination the component and its dependencies
// The ID is simply a UUID genreated from the concatenation of all elements
// Note that the dependencies are sorted and all string are cleaned (lower case and stripped from non alphanumerical characters)
const getId = (name: string, version: string, dependencies: Dependency[]) => {
  let idStr = prepString(name) + prepString(version)

  dependencies.sort((a: Dependency, b: Dependency) => {
    // Sort by name
    if (a.name > b.name) return 1
    if (a.name < b.name) return -1
    // If names are equal, then sort by version
    if (a.version > b.version) return 1
    if (a.version < b.version) return -1
    return 0
  }).forEach((d: Dependency) => {
    idStr = idStr + prepString(d.name) + prepString(d.version)
  })

  const UUID_NAMESPACE = 'c72d8f12-1818-4cb9-bead-44634c441c11'
  return uuidv5(idStr, UUID_NAMESPACE)
}

class JahiaTestrailReporter extends Command {
  static description = 'Submit data about a junit report to ZenCrepes'

  static args = [
    {name: 'file',
      required: true,
      description: 'A json/xml report or a folder containing one or multiple json/xml reports'},
    {name: 'payloadurl',
      required: true,
      description: 'The Webhook payload URL'},
    {name: 'secret',
      required: true,
      description: 'The webhook secret'},
  ]

  static flags = {
    help: flags.help({char: 'h'}),
    type: flags.string({
      char: 't',                        // shorter flag version
      description: 'report file type',  // help description for flag
      options: ['xml', 'json'],         // only allow the value to be from a discrete set
      default: 'xml',
    }),
    name: flags.string({
      char: 'n',
      description: 'Name of the element being tested (for example, name of the module)',
      default: 'Jahia',
    }),
    version: flags.string({
      char: 'v',
      description: 'Version of the element being tested',
      default: 'SNAPSHOT',
    }),
    dependencies: flags.string({
      char: 'd',
      description: 'Array of runtime dependencies of the element being tested [{name: "n", version: "v"}]',
      default: '[]',
    }),
    url: flags.string({
      char: 'u',
      description: 'Url associated with the run',
      default: '',
    }),
  }

  async run() {
    const {args, flags} = this.parse(JahiaTestrailReporter)

    // Extract a report object from the actual report files (either XML or JSON)
    const report = await ingestReport(flags.type, args.file, this.log)

    // From the report object, format the payload to be sent to ZenCrepes webhook (zqueue)
    const zcPayload: StateNode = {
      id: getId(flags.name, flags.version, JSON.parse(flags.dependencies)),
      name: flags.name,
      version: flags.version,
      dependency: JSON.parse(flags.dependencies),
      createdAt: new Date().toISOString(),
      state: report.failures === 0 ? 'PASS' : 'FAIL',
      url: flags.url,
      runTotal: report.tests,
      runSuccess: report.tests - report.failures,
      runFailure: report.failures,
      runDuration: report.time,

    }

    // Prepare the payload signature, is used by ZenCrepes (zqueue)
    // to ensure submitted is authorized
    const hmac = crypto.createHmac('sha1', args.secret)
    const digest = Buffer.from(
      'sha1=' + hmac.update(JSON.stringify(zcPayload)).digest('hex'),
      'utf8',
    )
    const xHubSignature = digest.toString()

    new SyncRequestClient()
    .addHeader('x-hub-signature', xHubSignature)
    .addHeader('Content-Type', 'application/json')
    .post(args.payloadurl, zcPayload)
  }
}

export = JahiaTestrailReporter
