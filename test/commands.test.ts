import {expect, test} from '@oclif/test'

describe('summary command', () => {
  test
  .stdout()
  .command(['summary', '--sourcePath', 'test/assets/single-json-success', '--sourceType', 'json'])
  .it('runs summary command with JSON input', ctx => {
    expect(ctx.stdout).to.contain('Total Tests:')
    expect(ctx.stdout).to.contain('Executed in')
  })
})

describe('slack command', () => {
  test
  .stdout()
  .command(['slack', '--help'])
  .it('shows slack help', ctx => {
    expect(ctx.stdout).to.contain('Submit data about a junit/mocha report to Slack')
  })
})

describe('testrail command', () => {
  test
  .stdout()
  .command(['testrail', '--help'])
  .it('shows testrail help', ctx => {
    expect(ctx.stdout).to.contain('Submit data about a junit/mocha report to TestRail')
  })
})

describe('zencrepes command', () => {
  test
  .stdout()
  .command(['zencrepes', '--help'])
  .it('shows zencrepes help', ctx => {
    expect(ctx.stdout).to.contain('Submit data about a junit/mocha report to ZenCrepes')
  })
})