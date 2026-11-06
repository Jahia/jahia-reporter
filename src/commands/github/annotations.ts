import { Command, Flags } from '@oclif/core';

import { JRRun } from '../../types/index.js';
import { formatAnnotation, getAnnotations } from '../../utils/github/index.js';
import ingestReport from '../../utils/ingest/index.js';

class JahiaGitHubAnnotations extends Command {
  static description =
    'Writes an error annotation of GitHub Actions for each failed test of the reports';
  static flags = {
    maxAnnotations: Flags.integer({
      default: 10,
      description:
        'The maximum number of annotations. GitHub Actions keeps 10 error annotations for each step',
      min: 1,
    }),
    silent: Flags.boolean({
      char: 's',
      default: false,
      description:
        'Should report ingestion be silent (not to display identified files)',
    }),
    sourcePath: Flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't',
      default: 'xml',
      description: 'The format of the report',
      options: ['xml', 'json'],
    }),
    testsPath: Flags.string({
      default: '',
      description:
        'The path of the test project from the root of the repository, which prefixes the spec file of each annotation',
    }),
  };

  async run() {
    const { flags } = await this.parse(JahiaGitHubAnnotations);

    const report: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
      flags.silent,
    );

    for (const annotation of getAnnotations({
      maxAnnotations: flags.maxAnnotations,
      report,
      testsPath: flags.testsPath,
    })) {
      this.log(formatAnnotation(annotation));
    }
  }
}

export default JahiaGitHubAnnotations;
