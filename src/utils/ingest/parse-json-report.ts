import {basename} from 'path'

import {JRRun, JRTestsuite} from '../../global.type'

// Take an array of junit json files, return a javascript representation of the files content
export const parseJson = (rawReports: any[]): JRRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const suites: JRTestsuite[] = rawReports
  .filter((rc: any) => rc.content.stats !== undefined && rc.content.tests !== undefined)
  .reduce((acc: any, rawContent: any) => {
    // Primary tests are the tests reported in the tests array of the report
    const primaryTests = rawContent.content.tests.map((t: any) => {
      return {
        name: t.title,
        steps: t.body,
        time: Math.round(t.duration / 1000), // Time is in ms, converting to s
        status: Object.values(t.err).length === 0 ? 'PASS' : 'FAIL',
        failures: Object.values(t.err).length === 0 ? [] : [{
          text: JSON.stringify(t.err),
        }],
      }
    })

    // In some situations (for example after each failing, we'd want to add those into the list of failed tests)
    const otherFailed = rawContent.content.failures
    .filter((t: any) => primaryTests.find((pt: any) => pt.name === t.title) === undefined)
    .map((t: any) => {
      return {
        name: t.title,
        time: Math.round(t.duration / 1000), // Time is in ms, converting to s
        status: 'FAIL',
        failures: Object.values(t.err).length === 0 ? [] : [{
          text: JSON.stringify(t.err),
        }],
      }
    })

    const suiteName = rawContent.content.tests[0] === undefined ? rawContent.content.failures[0].suite : rawContent.content.tests[0].suite
    const parsedSuite: any = [{
      name: suiteName + ' (' + basename(rawContent.filepath) + ')',
      failures: rawContent.content.stats.failures,
      timestamp: rawContent.content.stats.start,
      time: Math.round(rawContent.content.stats.duration / 1000), // Time is in ms, converting to s
      tests: [...primaryTests, ...otherFailed],
    }]

    return [...acc, ...parsedSuite]
  }, [])

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    tests: suites.map(r => r.tests.length).reduce((acc, count) => acc + count, 0),
    failures: suites.map(r => r.failures).reduce((acc, count) => acc + count, 0),
    time: suites.map(r => r.time).reduce((acc, count) => acc + count, 0),
    reports: [{
      name: 'Mocha JSON Report',
      tests: suites.map(r => r.tests.length).reduce((acc, count) => acc + count, 0),
      failures: suites.map(r => r.failures).reduce((acc, count) => acc + count, 0),
      time: suites.map(r => r.time).reduce((acc, count) => acc + count, 0),
      testsuites: suites,
    }],
  }
}
