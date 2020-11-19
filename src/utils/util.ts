import {lstatSync, readFileSync} from 'fs'
import {Test} from './testrail.interface'
import * as xmljs from 'xml-js'

/* eslint-disable max-depth */

export function parseJson(files: string[]): Test[] {
  const tests: Test[] = []
  for (const file of files) {
    if (lstatSync(file).isFile()) {
      const json = JSON.parse(readFileSync(file).toString())
      if (json.stats !== undefined && json.tests !== undefined) {
        for (const testInReport of json.tests) {
          const test: Test = {section: testInReport.suite, title: testInReport.title, time: testInReport.duration, steps: testInReport.body}
          if (testInReport.err.message) {
            test.comment = `${testInReport.err.name}\n${testInReport.err.message}\n${testInReport.err.stack}`
          }
          tests.push(test)
        }
      }
    }
  }
  return tests
}

export function parseXML(files: string[]): Test[] {
  const tests: Test[] = []
  for (const file of files) {
    if (lstatSync(file).isFile()) {
      const jUnitReportXml = readFileSync(file, 'utf8')
      const jUnitReport = xmljs.xml2js(jUnitReportXml)
      // get all the test suites
      const testSuites = jUnitReport.elements
      for (const highLevelTestSuite of testSuites) {
      // Go over all the tests
        for (const testSuite of highLevelTestSuite.elements) {
          const sectionName: string = testSuite.attributes.name.trim()
          for (const testCase of testSuite.elements) {
            const title = testCase.attributes.name.includes(sectionName) ?
              testCase.attributes.name.substring(sectionName.length + 1) :
              testCase.attributes.name
            const test: Test = {section: sectionName, title: title, time: testCase.attributes.time.replace('.', '')}
            if (testCase.elements) {
              let comment = ''
              for (const failure of testCase.elements) {
                if (failure.name === 'failure') {
                  for (const fail of failure.elements) {
                    comment += fail.text + '\n'
                  }
                }
              }
              test.comment = comment
            }
            tests.push(test)
          }
        }
      }
    }
  }
  return tests
}
