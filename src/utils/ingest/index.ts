import {lstatSync} from 'fs'
import * as glob from 'glob'
import {exit} from 'process'

import {parseXML} from './parse-xml-report'
import {parseJson} from './parse-json-report'
/*
  Contains a set of functions related to the ingestion of raw junit files
  Those files are then transformed into a standard report format, common across the different type of source files
*/

const ingestReport = async (reportType: string, reportFilePath: string, log: any) => {
  const type: string = reportType === undefined ? 'json/xml' : reportType
  let jsonFilesList: string[] = []
  let xmlFilesList: string[] = []

  if (lstatSync(reportFilePath).isDirectory()) {
    log(`${reportFilePath} is a folder. Looking for ${type} files:`)
    if (type !== 'xml') {
      jsonFilesList = glob.sync(reportFilePath + '/**/*.json', {})
      // eslint-disable-next-line unicorn/explicit-length-check
      if (jsonFilesList.length) {
        log(jsonFilesList.join('\r\n'))
      }
    }
    if (type !== 'json') {
      xmlFilesList = glob.sync(reportFilePath + '/**/*.xml', {})
      // eslint-disable-next-line unicorn/explicit-length-check
      if (xmlFilesList.length) {
        log(xmlFilesList.join('\r\n'))
      }
    }

    // We want json OR xml file/s but not both
    // eslint-disable-next-line unicorn/explicit-length-check
    if (type === 'json/xml' && xmlFilesList.length && jsonFilesList.length) {
      log(`ERROR: Two file types were found in ${reportFilePath}. Please specify file type`)
      exit()
    }

    // Check that at least one report type was found
    if (xmlFilesList.length === undefined && jsonFilesList.length === undefined) {
      log(`ERROR: Failed to find ${type} reports in the folder ${reportFilePath}`)
      exit()
    }
  } else if (lstatSync(reportFilePath).isFile()) {
    const fileExtension: string | undefined = reportFilePath.split('.').pop()
    if (type !== 'xml' && fileExtension === 'json') {
      jsonFilesList.push(reportFilePath)
    } else if (type !== 'json' && fileExtension === 'xml') {
      xmlFilesList.push(reportFilePath)
    } else {
      log(`ERROR: The flag type ${type} does not match the file provided ${reportFilePath}`)
      exit()
    }
  } else {
    log(`the path ${reportFilePath} is not a file nor a folder`)
    exit()
  }
  // Parse files into objects
  if (jsonFilesList.length > 0) {
    return parseJson(jsonFilesList)
  }
  return parseXML(xmlFilesList)
}

export default ingestReport
