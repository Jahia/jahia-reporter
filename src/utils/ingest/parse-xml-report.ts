import {lstatSync, readFileSync} from 'fs'
import * as xmljs from 'xml-js'

import {JunitReport, JunitRun} from '../../global.type'

/* eslint-disable max-depth */

// Format individual test cases
const buildTest = (xmlTests: any) => {
  return xmlTests.map((t: any) => {
    return {
      ...t.attributes,
      time: Math.round(t.attributes.time),
      status: t.elements === undefined ? 'success' : 'failure',
      failures: t.elements === undefined ? [] : t.elements.map((f: any) => {
        return {text: f.elements[0].text}
      }),
    }
  })
}

// Format individual test suites
const buildSuites = (xmlSuites: any) => {
  return xmlSuites.map((s: any) => {
    return {
      ...s.attributes,
      errors: Math.round(s.attributes.errors),
      failures: Math.round(s.attributes.failures),
      skipped: Math.round(s.attributes.skipped),
      testsCount: Math.round(s.attributes.tests),
      time: Math.round(s.attributes.time),
      tests: buildTest(s.elements),
    }
  })
}

// Take an array of junit xml files, return a javascript representation of the files content
export const parseXML = (files: string[]): JunitRun => {
  const reports: JunitReport[] = files
  .filter((f: string) => lstatSync(f).isFile())
  .reduce((acc: any, f: string) => {
    const jUnitReportXml = readFileSync(f, 'utf8')
    const jUnitReport = xmljs.xml2js(jUnitReportXml)

    const parsedReport: any = jUnitReport.elements
    .map((i: any) => {
      const report = {
        ...i.attributes,
        tests: Math.round(i.attributes.tests),
        failures: Math.round(i.attributes.failures),
        time: Math.round(i.attributes.time),
        testsuites: buildSuites(i.elements),
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
