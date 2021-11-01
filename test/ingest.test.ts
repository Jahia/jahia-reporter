import ingestReport from '../src/utils/ingest'
import * as path from 'path'

const log = (msg: string) => {
  // eslint-disable-next-line no-console
  console.log(msg)
}

// Verify sample reports are being ingested and match expected format
describe('Test report ingestion', () => {
  it('Single JSON (mochawesome-merge) - Without failure', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/single-json-failure'), log)
    expect(jrRun).toMatchSnapshot()
  })

  it('Single JSON (mochawesome-merge) - With failure', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/single-json-success'), log)
    expect(jrRun).toMatchSnapshot()
  })

  it('Multi JSON (mocha)', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/multi-json'), log)
    expect(jrRun).toMatchSnapshot()
  })

  it('JUnit XML', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/junit'), log)
    expect(jrRun).toMatchSnapshot()
  })
})
