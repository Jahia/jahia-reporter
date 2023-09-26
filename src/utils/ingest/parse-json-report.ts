import {basename} from 'path'

import {JRRun, JRTestsuite, JRReport} from '../../global.type'

const mochaParser = (rawReports: any[]): JRRun => {
  // Each file has one single report and one single suite, different in that from the xml report
  const reports: JRReport[] = rawReports
  .filter((rc: any) => rc.content.stats !== undefined && rc.content.results !== undefined)
  .reduce((acc: any, rawContent: any) => {
    const parsedReport: any = [{
      name: basename(rawContent.filepath),
      tests: rawContent.content.stats.tests,
      failures: rawContent.content.stats.failures,
      skipped: rawContent.content.stats.skipped,
      pending: rawContent.content.stats.pending,
      timestamp: rawContent.content.stats.start,
      time: Math.round(rawContent.content.stats.duration / 1000), // Time is in ms, converting to s
      testsuites: rawContent.content.results.map((mochaReport: any) => {
        return {
          name: mochaReport.suites[0].title,
          failures: mochaReport.suites[0].failures.length,
          skipped: mochaReport.suites[0].skipped.length,
          pending: mochaReport.suites[0].pending.length,
          time: mochaReport.suites[0].duration,
          timestamp: '',
          tests: mochaReport.suites[0].tests.map((mochaTest: any) => {
            let status = 'PASS'
            if (mochaTest.fail === true) {
              status = 'FAIL'
            } else if (mochaTest.pending === true) {
              status = 'PENDING'
            }
            return {
              name: mochaTest.title,
              time: mochaTest.duration,
              status,
              failures: [{text: mochaTest.err.estack}],
              steps: mochaTest.code,
            }
          }),
        }
      }),
    }]

    return [...acc, ...parsedReport]
  }, [])

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    tests: reports.map(r => r.tests).reduce((acc, count) => acc + count, 0),
    failures: reports.map(r => r.failures).reduce((acc, count) => acc + count, 0),
    skipped: reports.map(r => r.skipped).reduce((acc, count) => acc + count, 0),
    pending: reports.map(r => r.pending).reduce((acc, count) => acc + count, 0),
    time: reports.map(r => r.time).reduce((acc, count) => acc + count, 0),
    reports: reports,
  }
}

// Take an array of junit json files, return a javascript representation of the files content
export const parseJson = (rawReports: any[]): JRRun => {
  console.log('Proceeding with mocha parser')
  return mochaParser(rawReports) 
}
