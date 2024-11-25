import {Command, flags} from '@oclif/command'
import {SyncRequestClient} from 'ts-sync-request/dist'
import * as fs from 'fs'

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
    sourcePath: flags.string({
      description: 'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: flags.string({
      char: 't',                        // shorter flag version
      description: 'The format of the report',  // help description for flag
      options: ['xml', 'json'],         // only allow the value to be from a discrete set
      default: 'xml',
    }),
    webhook: flags.string({
      description: 'The Webhook URL to send the payload to',
      required: true,
    }),
    webhookSecret: flags.string({
      description: 'The webhook secret',
      required: true,
    }),
    name: flags.string({
      description: 'Name of the element being tested (for example, a module ID)',
      default: 'Jahia',
    }),
    version: flags.string({
      description: 'Version of the element being tested (for example a module version)',
      default: 'SNAPSHOT',
    }),
    dependencies: flags.string({
      description: 'Array of runtime dependencies of the element being tested [{name: "n", version: "v"}]',
      default: '[]',
    }),
    runUrl: flags.string({
      description: 'Url associated with the run',
      default: '',
    }),
    moduleFilepath: flags.string({
      description: 'Fetch version details from a version JSON generated with utils:modules (overwrites name and version)',
    }),
  }

  async run() {
    const {flags} = this.parse(JahiaTestrailReporter)

    // Extract a report object from the actual report files (either XML or JSON)
    const report = await ingestReport(flags.sourceType, flags.sourcePath, this.log)

    // If dependencies were previously fetched, use those for the module
    let dependencies = JSON.parse(flags.dependencies)
    let name = flags.name
    let version = flags.version
    let jahiaFullVersion = ''
    let moduleVersion = ''
    if (flags.moduleFilepath !== undefined) {
      const versionFile: any = fs.readFileSync(flags.moduleFilepath)
      const versions: UtilsVersions = JSON.parse(versionFile)
      if (versions.jahia.fullVersion !== '') {
        jahiaFullVersion = versions.jahia.fullVersion
      }
      if (versions.module.id !== '' && versions.module.version !== '') {
        moduleVersion = `${versions.module.id}-${versions.module.version}`
      }      
      if (versions.jahia.build === '') {
        dependencies.push({name: 'Jahia', version: versions.jahia.version})
      } else {
        dependencies.push({name: 'Jahia', version: `${versions.jahia.version}-${versions.jahia.build}`})
      }
      dependencies = [...dependencies, ...versions.dependencies]
      version = versions.module.version
      name = versions.module.id
    }

    // Get all individual test cases in an array
    const testCases: any = []
    for (const r of report.reports) {
      for (const suite of r.testsuites) {
        for (const test of suite.tests) {
          testCases.push({
            id: getId(test.name, flags.version, dependencies),
            name: test.name,
            suite: suite.name,
            duration: test.time,
            state: test.status,
            jahia: jahiaFullVersion,
            module: moduleVersion,
            caseTotal: 1, // Hack to fit in Zencrepes ZUI existing data model
            caseSuccess: test.status === 'PASS' ? 1 : 0,
            caseFailure: test.status === 'FAIL' ? 1 : 0,
            createdAt: r.timestamp === undefined ? new Date().toISOString() : new Date(r.timestamp).toISOString(),
          })
        }
      }
    }
    // const testCases = report.reports.reduce((acc: any, report: any) => {
    //   console.log(report)
    // }, [])

    // From the report object, format the payload to be sent to ZenCrepes webhook (zqueue)
    const zcPayload: ZenCrepesStateNode = {
      id: getId(name, flags.version, dependencies),
      name: name,
      version: version,
      dependencies: dependencies,
      createdAt: new Date().toISOString(),
      state: report.failures === 0 ? 'PASS' : 'FAIL',
      url: flags.runUrl,
      cases: testCases,
      runTotal: report.tests,
      runSuccess: report.tests - report.failures,
      runFailure: report.failures,
      runDuration: report.time,
    }

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
