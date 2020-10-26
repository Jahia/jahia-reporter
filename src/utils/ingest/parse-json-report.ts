import {lstatSync, readFileSync} from 'fs'

import {JunitRun, TestSuite} from '../../global.type'

// Take an array of junit json files, return a javascript representation of the files content
export const parseJson = (files: string[]): JunitRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const suites: TestSuite[] = files
  .filter((f: string) => lstatSync(f).isFile())
  .reduce((acc: any, f: string) => {
    const json = JSON.parse(readFileSync(f).toString())

    const parsedSuite: any = [{
      name: json.tests[0].suite,
      failures: json.stats.failures,
      timestamp: json.stats.start,
      time: json.stats.duration,
      tests: json.tests.map((t: any) => {
        return {
          name: t.title,
          time: t.duration,
          status: Object.values(t.err).length === 0 ? 'PASS' : 'FAIL',
          failures: Object.values(t.err).length === 0 ? [] : [{
            text: JSON.stringify(t.err),
          }],
        }
      }),
    }]
    return [...acc, ...parsedSuite]
  }, [])

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    tests: suites.map(r => r.tests.length).reduce((acc, count) => acc + count, 0),
    failures: suites.map(r => r.failures).reduce((acc, count) => acc + count, 0),
    time: suites.map(r => r.time).reduce((acc, count) => acc + count, 0),
    reports: [{
      name: 'JSON Test Report',
      tests: suites.map(r => r.tests.length).reduce((acc, count) => acc + count, 0),
      failures: suites.map(r => r.failures).reduce((acc, count) => acc + count, 0),
      time: suites.map(r => r.time).reduce((acc, count) => acc + count, 0),
      testsuites: suites,
    }],
  }
}
