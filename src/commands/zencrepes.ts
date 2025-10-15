import { Command, Flags } from '@oclif/core';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { SyncRequestClient } from 'ts-sync-request/dist/index.js';
import { v5 as uuidv5 } from 'uuid';

import {
  JRCase,
  JRRun,
  UtilsVersions,
  ZenCrepesDependency,
  ZenCrepesStateNode,
} from '../global.type';
import ingestReport from '../utils/ingest/index.js';

const prepString = (s: string): string =>
  s.replaceAll(/[^\dA-Za-z]/g, '').toLowerCase();

// This generate an unique id based on the combination the component and its dependencies
// The ID is simply a UUID genreated from the concatenation of all elements
// Note that the dependencies are sorted and all string are cleaned (lower case and stripped from non alphanumerical characters)
const getId = (
  name: string,
  version: string,
  dependencies: ZenCrepesDependency[],
): string => {
  let idStr = prepString(name) + prepString(version);

  dependencies
    .sort((a: ZenCrepesDependency, b: ZenCrepesDependency) => {
      // Sort by name
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      // If names are equal, then sort by version
      if (a.version > b.version) return 1;
      if (a.version < b.version) return -1;
      return 0;
    })
    .forEach((d: ZenCrepesDependency) => {
      idStr = idStr + prepString(d.name) + prepString(d.version);
    });

  const UUID_NAMESPACE = 'c72d8f12-1818-4cb9-bead-44634c441c11';
  return uuidv5(idStr, UUID_NAMESPACE);
};

export default class ZencrepesCommand extends Command {
  static override description =
    'Submit data about a junit/mocha report to ZenCrepes';

  static override flags = {
    dependencies: Flags.string({
      default: '[]',
      description:
        'Array of runtime dependencies of the element being tested [{name: "n", version: "v"}]',
    }),
    moduleFilepath: Flags.string({
      description:
        'Fetch version details from a version JSON generated with utils:modules (overwrites name and version)',
    }),
    name: Flags.string({
      default: 'Jahia',
      description:
        'Name of the element being tested (for example, a module ID)',
    }),
    runUrl: Flags.string({
      default: '',
      description: 'Url associated with the run',
    }),
    sourcePath: Flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't', // shorter flag version
      default: 'xml',
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json'] as const, // only allow the value to be from a discrete set
    }),
    version: Flags.string({
      default: 'SNAPSHOT',
      description:
        'Version of the element being tested (for example a module version)',
    }),
    webhook: Flags.string({
      description: 'The Webhook URL to send the payload to',
      required: true,
    }),
    webhookSecret: Flags.string({
      description: 'The webhook secret',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ZencrepesCommand);

    // Extract a report object from the actual report files (either XML or JSON)
    const report: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log,
    );

    // If dependencies were previously fetched, use those for the module
    let dependencies = JSON.parse(flags.dependencies);
    let name = '';
    let { version } = flags;
    let jahiaVersion = '';
    let moduleVersion = '';
    if (flags.moduleFilepath !== undefined) {
      const versionFile: any = fs.readFileSync(flags.moduleFilepath);
      const versions: UtilsVersions = JSON.parse(versionFile);
      if (versions.jahia.version !== '') {
        jahiaVersion = `Jahia ${versions.jahia.version}`;
      }

      if (versions.module.id !== '' && versions.module.version !== '') {
        moduleVersion = `${versions.module.id}-${versions.module.version}`;
      }

      if (versions.jahia.build === '') {
        dependencies.push({ name: 'Jahia', version: versions.jahia.version });
      } else {
        dependencies.push({
          name: 'Jahia',
          version: `${versions.jahia.version}-${versions.jahia.build}`,
        });
      }

      dependencies = [...dependencies, ...versions.dependencies];
      version = versions.module.version;
      name = versions.module.id;
    }

    // If name could not be fetched from the module file, fallback on the flag value
    if (name === '') {
      name = flags.name;
    }

    // Get all individual test cases in an array
    const testCases: JRCase[] = [];
    for (const r of report.reports) {
      for (const suite of r.testsuites) {
        for (const test of suite.tests) {
          testCases.push({
            caseFailure: test.status === 'FAIL' ? 1 : 0,
            caseSuccess: test.status === 'PASS' ? 1 : 0,
            caseTotal: 1, // Hack to fit in Zencrepes ZUI existing data model
            createdAt:
              r.timestamp === undefined
                ? new Date().toISOString()
                : new Date(r.timestamp).toISOString(),
            duration: test.time,
            id: getId(test.name, flags.version, dependencies),
            jahia: jahiaVersion,
            module: moduleVersion,
            name: test.name,
            state: test.status,
            suite: suite.name,
          });
        }
      }
    }

    // From the report object, format the payload to be sent to ZenCrepes webhook (zqueue)
    const zcPayload: ZenCrepesStateNode = {
      cases: testCases,
      createdAt: new Date().toISOString(),
      dependencies,
      id: getId(name, flags.version, dependencies),
      name,
      runDuration: report.time,
      runFailure: report.failures,
      runSuccess: report.tests - report.failures,
      runTotal: report.tests,
      state: report.failures === 0 ? 'PASS' : 'FAIL',
      url: flags.runUrl,
      version,
    };

    // Prepare the payload signature, is used by ZenCrepes (zqueue)
    // to ensure submitted is authorized
    const hmac = crypto.createHmac('sha1', flags.webhookSecret);
    const digest = Buffer.from(
      'sha1=' + hmac.update(JSON.stringify(zcPayload)).digest('hex'),
      'utf8',
    );
    const xHubSignature = digest.toString();

    this.log(JSON.stringify(zcPayload));

    try {
      new SyncRequestClient()
        .addHeader('x-hub-signature', xHubSignature)
        .addHeader('Content-Type', 'application/json')
        .post(flags.webhook, zcPayload);
    } catch (error) {
      this.log('ERROR: Unable to submit data to ZenCrepes');
      this.log(JSON.stringify(error));
    }
  }
}
