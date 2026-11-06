import * as path from 'node:path'

import ingestReport from '../src/utils/ingest'

const log = (msg: string) => {
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
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/junit'), log)
    expect(jrRun).toMatchSnapshot()
  })

  it('Mocha JUnit XML (generated using: mocha-junit-reporter)', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/mocha-junit'), log)
    expect(jrRun).toMatchSnapshot()
  })

  it('JMeter Perf Analysis JSON', async () => {
    const jrRun = await ingestReport('json-perf', path.resolve(__dirname, './assets/perf-json/perf-analysis.json'), log)
    expect(jrRun).toMatchSnapshot()
  })
})

// The spec file of a suite and the error of a failed test, which the annotations of a GitHub step need
describe('Spec file and error of a failed test', () => {
  it('reads the spec file from the root suite of a mocha-junit-reporter report', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/mocha-junit-failure'), log)
    const [suite] = jrRun.reports[0].testsuites
    expect(suite.file).toBe('cypress/e2e/jcontent/versionCopyField.cy.ts')
  })

  it('reads the message and the stack of a failed test of an XML report', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/mocha-junit-failure'), log)
    const [failed, passed] = jrRun.reports[0].testsuites[0].tests
    expect(failed.error?.message).toBe(
      'Timed out retrying after 10000ms: Expected to find element: `[data-sel-role="right-column"]`, but never found it.',
    )
    expect(failed.error?.stack).toContain('versionCopyField.cy.ts:128:8')
    expect(passed.error).toBeUndefined()
  })

  it('gives each suite of a merged report the spec file of the root suite before it', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/mocha-junit-merged'), log)
    expect(jrRun.reports[0].testsuites.map((suite) => [suite.name, suite.file])).toEqual([
      ['Alpha', 'cypress/e2e/alpha.cy.ts'],
      ['Beta', 'cypress/e2e/beta.cy.ts'],
    ])
  })

  it('takes the message of a failure that has none from the first line of its stack', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/mocha-junit-merged'), log)
    expect(jrRun.reports[0].testsuites.map((suite) => suite.tests[0].error?.message)).toEqual([
      'Error: boom',
      'AssertionError: expected 1 to equal 2',
    ])
  })

  it('gives an empty message and an empty stack to a failed mochawesome test whose error has neither', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/json-failure-no-stack'), log)
    expect(jrRun.reports[0].testsuites[0].tests[0].error).toEqual({ message: '', stack: '' })
  })

  it('reads as passed a JUnit testcase that holds no failure and no error', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/junit-no-failure'), log)
    expect(jrRun.reports[0].testsuites[0].tests.map((test) => test.status)).toEqual(['PASS', 'PASS'])
  })

  it('reads as failed a JUnit testcase that holds a failure after its output', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/junit-output-then-failure'), log)
    expect(jrRun.reports[0].testsuites[0].tests.map((test) => [test.status, test.error?.message])).toEqual([
      ['FAIL', 'expected 1 to equal 2'],
      ['FAIL', 'expected 3 to equal 4'],
    ])
  })

  it('reads the error of a failed test of a JUnit report that names no spec file', async () => {
    const jrRun = await ingestReport('xml', path.resolve(__dirname, './assets/junit/TEST-org.jahia.modules.forms.library.tests.FormResultsTest.xml'), log)
    const suite = jrRun.reports[0].testsuites[0]
    const failed = suite.tests.find((test) => test.status === 'FAIL')
    expect(suite.file).toBeUndefined()
    expect(failed?.error?.message).toMatch(/^No \.csv files found in the Downloads folder/)
  })

  it('reads the spec file and the error of a failed test of a mochawesome report', async () => {
    const jrRun = await ingestReport('json', path.resolve(__dirname, './assets/single-json-failure'), log)
    const suite = jrRun.reports[0].testsuites.find((s) => s.failures > 0)
    const failed = suite?.tests.find((test) => test.status === 'FAIL')
    expect(suite?.file).toBe('cypress/integration/ui/profileCsvExport.spec.ts')
    expect(failed?.error?.message).toMatch(/^CypressError: `cy.task\('listFiles'\)` failed/)
    expect(failed?.error?.stack).toContain('cypress_runner.js')
  })
})
