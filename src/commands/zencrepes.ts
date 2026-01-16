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
} from '../types/index.js';
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

  dependencies.sort((a: ZenCrepesDependency, b: ZenCrepesDependency) => {
    // Sort by name
    if (a.name > b.name) return 1;
    if (a.name < b.name) return -1;
    // If names are equal, then sort by version
    if (a.version > b.version) return 1;
    if (a.version < b.version) return -1;
    return 0;
  });

  for (const d of dependencies) {
    idStr = idStr + prepString(d.name) + prepString(d.version);
  }

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
    const {
      dependencies: dependenciesString,
      moduleFilepath,
      name: flagName,
      runUrl,
      sourcePath,
      sourceType,
      version,
      webhook,
      webhookSecret,
    } = flags;

    // Extract a report object from the actual report files (either XML or JSON)
    const report: JRRun = await ingestReport(
      sourceType,
      sourcePath,
      this.log.bind(this),
    );

    // If dependencies were previously fetched, use those for the module
    let dependencies = JSON.parse(dependenciesString);
    let name = '';
    let currentVersion = version;
    let jahiaVersion = '';
    let moduleVersion = '';
    if (moduleFilepath !== undefined) {
      const versionFile = fs.readFileSync(moduleFilepath, 'utf8');
      const versions: UtilsVersions = JSON.parse(versionFile);
      const { dependencies: versionDependencies, jahia, module } = versions;

      if (jahia.version !== '') {
        jahiaVersion = `Jahia ${jahia.version}`;
      }

      if (module.id !== '' && module.version !== '') {
        moduleVersion = `${module.id}-${module.version}`;
      }

      if (jahia.build === '') {
        dependencies.push({ name: 'Jahia', version: jahia.version });
      } else {
        dependencies.push({
          name: 'Jahia',
          version: `${jahia.version}-${jahia.build}`,
        });
      }

      dependencies = [...dependencies, ...versionDependencies];
      currentVersion = module.version;
      name = module.id;
    }

    // If name could not be fetched from the module file, fallback on the flag value
    if (name === '') {
      name = flagName;
    }

    // Get all individual test cases in an array
    const testCases: JRCase[] = [];
    for (const r of report.reports) {
      const { testsuites, timestamp } = r;
      for (const suite of testsuites) {
        const { name: suiteName } = suite;
        for (const test of suite.tests) {
          const { name: testName, status, time } = test;
          testCases.push({
            caseFailure: status === 'FAIL' ? 1 : 0,
            caseSuccess: status === 'PASS' ? 1 : 0,
            caseTotal: 1, // Hack to fit in Zencrepes ZUI existing data model
            createdAt:
              timestamp === undefined
                ? new Date().toISOString()
                : new Date(timestamp).toISOString(),
            duration: time,
            id: getId(testName, currentVersion, dependencies),
            jahia: jahiaVersion,
            module: moduleVersion,
            name: testName,
            state: status,
            suite: suiteName,
          });
        }
      }
    }

    // From the report object, format the payload to be sent to ZenCrepes webhook (zqueue)
    const { failures, tests, time } = report;
    const zcPayload: ZenCrepesStateNode = {
      cases: testCases,
      createdAt: new Date().toISOString(),
      dependencies,
      id: getId(name, currentVersion, dependencies),
      name,
      runDuration: time,
      runFailure: failures,
      runSuccess: tests - failures,
      runTotal: tests,
      state: failures === 0 ? 'PASS' : 'FAIL',
      url: runUrl,
      version: currentVersion,
    };

    // Prepare the payload signature, is used by ZenCrepes (zqueue)
    // to ensure submitted is authorized
    const hmac = crypto.createHmac('sha1', webhookSecret);
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
        .post(webhook, zcPayload);
    } catch (error) {
      this.log('ERROR: Unable to submit data to ZenCrepes');
      this.log(JSON.stringify(error));
    }
  }
}
