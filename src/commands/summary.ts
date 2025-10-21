/* eslint max-depth: ["error", 5] */
import {Command, Flags} from '@oclif/core'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {JRRun} from '../global.type'
import ingestReport from '../utils/ingest/index.js'
import {getSummary} from '../utils/reports/getSummary.js'

export default class SummaryCommand extends Command {
  static override description = 'Display a summary of the test results'

  static override flags = {
    savePath: Flags.string({
      default: '',
      description: 'Path to save the report as JSON',
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
      char: 't', // shorter flag version
      default: 'xml',
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json'], // only allow the value to be from a discrete set
    }),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(SummaryCommand)

    // Extract a report object from the actual report files (either XML or JSON)
    const report: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
      flags.silent,
    )

    if (flags.savePath !== '') {
      fs.writeFileSync(path.join(flags.savePath), JSON.stringify(report))
    }

    const summary = getSummary({
      report,
      sourceType: flags.sourceType,
    })

    this.log(summary)
  }
}
