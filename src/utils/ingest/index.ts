import * as glob from 'glob'
import {lstatSync, readFileSync} from 'node:fs'
import {exit} from 'node:process'
import * as xmljs from 'xml-js'

import {parseJsonPerf} from './parse-json-perf-report.js'
import {parseJson} from './parse-json-report.js'
import {parseXML} from './parse-xml-report.js'

// Takes a file and returns its parsed content
const parseFile = (reportType: string, filePath: string) => {
  const rawFile = readFileSync(filePath, 'utf8')
  if (reportType === 'xml') {
    return xmljs.xml2js(rawFile, {ignoreComment: true})
  }

  if (reportType === 'json' || reportType === 'json-perf') {
    return JSON.parse(rawFile.toString())
  }

  return {}
}

/*
  Contains a set of functions related to the ingestion of raw junit files
  Those files are then transformed into a standard report format, common across the different type of source files

  Note: It is necessary to supply a reportType to cover scenario in which a folder would contain both json and xml
*/
const ingestReport = async (
  reportType: string,
  reportFilePath: string,
  log: any,
  silent = false,
) => {
  const supportedFormats = new Set(['json', 'xml', 'json-perf'])
  let reportFiles: string[] = []
  if (!supportedFormats.has(reportType)) {
    log(`${reportType} is not a supported format`)
    exit(1)
  }

  if (reportType === 'json-perf') {
    if (lstatSync(reportFilePath).isFile()) {
      log(`${reportFilePath} is a file`)
      const reportContent = parseFile(reportType, reportFilePath)
      return parseJsonPerf(reportContent)
    }

    log(`${reportFilePath} is not a valid file`)
    exit(1)
  }

  // Created an array of report files for further processing
  if (lstatSync(reportFilePath).isDirectory()) {
    if (silent !== true) {
      log(`${reportFilePath} is a folder. Looking for report files:`)
    }

    reportFiles = glob.sync(reportFilePath + '/**/*.' + reportType, {})
    if (reportFiles.length > 0 && silent !== true) {
      log(reportFiles.join('\r\n'))
    }
  } else if (lstatSync(reportFilePath).isFile()) {
    if (silent !== true) {
      log(`${reportFilePath} is a file`)
    }

    const fileExtension: string | undefined = reportFilePath.split('.').pop()
    if (fileExtension === undefined) {
      log('Unable to detect file extension')
      exit(1)
    }

    if (!supportedFormats.has(fileExtension)) {
      log(`${fileExtension} is not a supported format`)
      exit(1)
    }

    reportFiles.push(reportFilePath)
  }

  // Fetch the content from this array of files
  const reportsRaw = reportFiles
  .filter((f: string) => lstatSync(f).isFile())
  .map((f: string) => ({
    content: parseFile(reportType, f),
    filepath: f,
  }))

  if (reportType === 'json') {
    return parseJson(reportsRaw)
  }

  if (reportType === 'xml') {
    return parseXML(reportsRaw)
  }

  exit(1)
}

export default ingestReport
