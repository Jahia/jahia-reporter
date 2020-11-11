import {lstatSync, readFileSync} from 'fs'
import {basename} from 'path'

import {JunitRun, TestSuite} from '../../global.type'

// Take an array of junit json files, return a javascript representation of the files content
export const parseJson = (files: string[]): JunitRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const suites: TestSuite[] = files
  .filter((f: string) => lstatSync(f).isFile())
  .reduce((acc: any, f: string) => {
    const json = JSON.parse(readFileSync(f).toString())

    // Primary tests are the tests reported in the tests array of the report
    const primaryTests = json.tests.map((t: any) => {
      return {
        name: t.title,
        time: t.duration,
        status: Object.values(t.err).length === 0 ? 'PASS' : 'FAIL',
        failures: Object.values(t.err).length === 0 ? [] : [{
          text: JSON.stringify(t.err),
        }],
      }
    })

    // In some situations (for example after each failing, we'd want to add those into the list of failed tests)
    const otherFailed = json.failures
    .filter((t: any) => primaryTests.find((pt: any) => pt.name === t.title) === undefined)
    .map((t: any) => {
      return {
        name: t.title,
        time: t.duration,
        status: 'FAIL',
        failures: Object.values(t.err).length === 0 ? [] : [{
          text: JSON.stringify(t.err),
        }],
      }
    })

    const parsedSuite: any = [{
      name: json.tests[0].suite + ' (' + basename(f) + ')',
      failures: json.stats.failures,
      timestamp: json.stats.start,
      time: json.stats.duration,
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
