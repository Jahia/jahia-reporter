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
$ jahia-testrail-reporter COMMAND
running command...
$ jahia-testrail-reporter (-v|--version|version)
jahia-testrail-reporter/0.1.9 darwin-x64 node-v14.3.0
$ jahia-testrail-reporter --help [COMMAND]
USAGE
  $ jahia-testrail-reporter COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`jahia-testrail-reporter testrail FILE USERNAME PASSWORD [TESTRAILURL]`](#jahia-testrail-reporter-testrail-file-username-password-testrailurl)
* [`jahia-testrail-reporter zencrepes FILE PAYLOADURL SECRET`](#jahia-testrail-reporter-zencrepes-file-payloadurl-secret)

## `jahia-testrail-reporter testrail FILE USERNAME PASSWORD [TESTRAILURL]`

Submit data about a junit report to TestRail

```
USAGE
  $ jahia-testrail-reporter testrail FILE USERNAME PASSWORD [TESTRAILURL]

ARGUMENTS
  FILE         A json/xml report or a folder containing one or multiple json/xml reports
  USERNAME     TestRail username
  PASSWORD     TestRail password
  TESTRAILURL  [default: https://jahia.testrail.net] TestRail url to submit the results from the report to

OPTIONS
  -d, --defaultRunDescription=defaultRunDescription  [default: This test run was manually triggered] TestRail default
                                                     run description

  -h, --help                                         show CLI help

  -j, --jahiaVersion=jahiaVersion                    [default: 8.0.1.0] Jahia/Module version

  -m, --milestone=milestone                          [default: Default] TestRail milestone

  -n, --projectName=projectName                      [default: Jahia] TestRail Project name

  -p, --parentSection=parentSection                  TestRail default run description

  -r, --runName=runName                              [default: Automated Execution - ] TestRail run name

  -s, --suiteName=suiteName                          [default: Master] TestRail suite name

  -t, --type=xml|json                                report file type

  -v, --version                                      show CLI version
```

_See code: [lib/commands/testrail.js](https://github.com/VladRadan/jahia-testrail-reporter/blob/v0.1.9/lib/commands/testrail.js)_

## `jahia-testrail-reporter zencrepes FILE PAYLOADURL SECRET`

Submit data about a junit report to ZenCrepes

```
USAGE
  $ jahia-testrail-reporter zencrepes FILE PAYLOADURL SECRET

ARGUMENTS
  FILE        A json/xml report or a folder containing one or multiple json/xml reports
  PAYLOADURL  The Webhook payload URL
  SECRET      The webhook secret

OPTIONS
  -d, --dependencies=dependencies  [default: []] Array of runtime dependencies of the element being tested [{name: "n",
                                   version: "v"}]

  -h, --help                       show CLI help

  -n, --name=name                  [default: Jahia] Name of the element being tested (for example, name of the module)

  -t, --type=xml|json              [default: xml] report file type

  -u, --url=url                    Url associated with the run

  -v, --version=version            [default: SNAPSHOT] Version of the element being tested
```

_See code: [lib/commands/zencrepes.js](https://github.com/VladRadan/jahia-testrail-reporter/blob/v0.1.9/lib/commands/zencrepes.js)_
<!-- commandsstop -->
