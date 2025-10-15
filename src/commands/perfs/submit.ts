import { Command, Flags } from '@oclif/core';
import * as loadYamlFile from 'load-yaml-file';
import * as crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as fs from 'node:fs';
import gh from 'parse-github-url';
import { SyncRequestClient } from 'ts-sync-request/dist/index.js';

class JahiaPerfsReporter extends Command {
  static description = 'Submit data about a junit/mocha report to ZenCrepes';

  static flags = {
    help: Flags.help({ char: 'h' }),
    repoUrl: Flags.string({
      description: 'Name of the run',
      required: true,
    }),
    runName: Flags.string({
      description: 'Name of the run',
      required: true,
    }),
    runUrl: Flags.string({
      default: '',
      description: 'URL of the run',
      required: false,
    }),
    runsFile: Flags.string({
      description:
        'A json file containing the perf report provided by the jmeter container',
      required: true,
    }),
    tfsettingsFile: Flags.string({
      description: 'A Terraform tfsettings file',
      required: true,
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

  async run() {
    const { flags } = await this.parse(JahiaPerfsReporter);

    let jMeterRuns = {};
    if (fs.existsSync(flags.runsFile)) {
      const rawFile = readFileSync(flags.runsFile, 'utf8');
      jMeterRuns = JSON.parse(rawFile.toString());
    } else {
      this.log(`Unable to read runsFile at: ${flags.runsFile}`);
      this.exit(1);
    }

    let tfsettings: any = {};
    if (fs.existsSync(flags.tfsettingsFile)) {
      tfsettings = await loadYamlFile(flags.tfsettingsFile);
    } else {
      this.log(`Unable to read tfsettingsFile at: ${flags.tfsettingsFile}`);
      this.exit(1);
    }

    const ghObj = gh(flags.repoUrl);
    if (ghObj === null) {
      this.log(`Unable to parse repo url: ${flags.repoUrl}`);
      this.exit(1);
    } else {
      const resources = Object.entries(tfsettings.docker_containers);
      const zcPayload: any = {
        name: flags.runName,
        platform: {
          region: tfsettings.aws_region,
          tenant: 'jahia-sandbox',
          vendor: 'AWS',
        },
        repository: {
          name: ghObj.name,
          owner: {
            login: ghObj.owner,
            url: 'https://github.com/' + ghObj.owner,
          },
          url: flags.repoUrl,
        },
        resources: resources.map((r: any) => ({
          image: r[1].image,
          name: r[1].name,
          size: r[1].ec2_instance_type,
          tfsettings: JSON.stringify(r[1]),
        })),
        url: flags.runUrl,
        ...jMeterRuns,
      };

      // Prepare the payload signature, is used by ZenCrepes (zqueue)
      // to ensure submitted is authorized
      const hmac = crypto.createHmac('sha1', flags.webhookSecret);
      const digest = Buffer.from(
        'sha1=' + hmac.update(JSON.stringify(zcPayload)).digest('hex'),
        'utf8',
      );
      const xHubSignature = digest.toString();

      this.log(zcPayload);

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
}

export default JahiaPerfsReporter;
