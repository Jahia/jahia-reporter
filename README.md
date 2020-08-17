jahia-testrail-reporter
=======================

Testrail reporter that accepts mocha json and jest xml reports

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![CircleCI](https://circleci.com/gh/VladRadan/jahia-testrail-reporter/tree/master.svg?style=shield)](https://circleci.com/gh/VladRadan/jahia-testrail-reporter/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![License](https://img.shields.io/npm/l/jahia-testrail-reporter.svg)](https://github.com/VladRadan/jahia-testrail-reporter/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g jahia-testrail-reporter
USAGE
  $ jahia-testrail-reporter FILE USERNAME PASSWORD [TESTRAILURL]

ARGUMENTS
  FILE         A json/xml report or a folder containing one or multiple json/xml reports
  USERNAME     TestRail username
  PASSWORD     TestRail password
  TESTRAILURL  [default: https://jahia.testrail.net] TestRail url to submit the results from the report to

OPTIONS
  -d, --defaultRunDescription=defaultRunDescription  [default: This test run was manually triggered] TestRail
                                                     default run description

  -h, --help                                         show CLI help

  -j, --jahiaVersion=jahiaVersion                    [default: 8.0.1.0] Jahia/Module version

  -m, --milestone=milestone                          [default: Default] TestRail milestone

  -n, --projectName=projectName                      [default: Jahia] TestRail Project name

  -p, --parentSection=parentSection                  TestRail default run description

  -r, --runName=runName                              [default: Automated Execution] TestRail run name

  -s, --suiteName=suiteName                          [default: Master] TestRail suite name

  -t, --type=xml|json                                report file type

  -v, --version                                      show CLI version
...
```
<!-- usagestop -->
# Commands
<!-- commands -->

<!-- commandsstop -->
