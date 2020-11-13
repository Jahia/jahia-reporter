import {JunitReport, JunitRun} from '../../global.type'
import {basename} from 'path'

/* eslint-disable max-depth */
// Format individual test cases
const buildTest = (xmlTests: any) => {
  return xmlTests.map((t: any) => {
    return {
      ...t.attributes,
      time: Math.round(t.attributes.time),
      status: t.elements === undefined ? 'PASS' : 'FAIL',
      failures: t.elements === undefined ? [] : t.elements.map((f: any) => {
        return JSON.stringify(f.elements)
      }),
    }
  })
}

// Format individual test suites
const buildSuites = (xmlSuites: any, testFilename: string) => {
  return xmlSuites.map((s: any) => {
    return {
      ...s.attributes,
      // Some of the existing testsuites have 'null' (as a string) instead of
      // a name, if this is the case, we replace null by the name of the file
      // which is more informative
      name: s.attributes.name === 'null' ? testFilename : s.attributes.name,
      errors: Math.round(s.attributes.errors),
      failures: Math.round(s.attributes.failures),
      skipped: Math.round(s.attributes.skipped),
      testsCount: Math.round(s.attributes.tests),
      time: Math.round(s.attributes.time),
      tests: buildTest(s.elements.filter((t: any) => t.name === 'testcase')),
    }
  })
}

// Take an array of junit xml files, return a javascript representation of the files content
export const parseXML = (rawReports: any[]): JunitRun => {
  const reports: JunitReport[] = rawReports
  .reduce((acc: any, rawContent: any) => {
    const parsedReport: any = rawContent.content.elements
    .map((i: any) => {
      let testsuites = []
      if (i.name === 'testsuite' || i.name === 'suite') {
        testsuites = buildSuites([i], basename(rawContent.filepath))
      } else {
        testsuites = buildSuites(i.elements, basename(rawContent.filepath))
      }
      const report = {
        ...i.attributes,
        name: i.attributes.name === 'null' ? basename(rawContent.filepath) : i.attributes.name,
        tests: Math.round(i.attributes.tests),
        failures: Math.round(i.attributes.failures),
        time: Math.round(i.attributes.time),
        // testsuites: buildSuites(i.elements),
        testsuites: testsuites,
      }
      return  report
    })
    return [...acc, ...parsedReport]
  }, [])

  // Once all files are concatenated, generate an aggregate of all of the reports below
  return {
    tests: reports.map(r => r.tests).reduce((acc, count) => acc + count, 0),
    failures: reports.map(r => r.failures).reduce((acc, count) => acc + count, 0),
    time: reports.map(r => r.time).reduce((acc, count) => acc + count, 0),
    reports: reports,
  }
}
