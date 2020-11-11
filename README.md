# jahia-reporter

Using Mocha JSON or JEST/JUNIT XML as input, jahia-reporter is a CLI tool built with [OCLIF](https://oclif.io/) to various perform actions following a test execution (send results to testrail, to slack, ...).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![Downloads/week](https://img.shields.io/npm/dw/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![License](https://img.shields.io/npm/l/jahia-testrail-reporter.svg)](https://github.com/VladRadan/jahia-testrail-reporter/blob/master/package.json)

## Available Commands

| Command   | Description                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| testrail  | Sends content of the report to a given testrail project (by name, project must be created in advance). Automatically creates milestones, runs and test cases. |
| slack     | Sends slack notification based on the content of a report                                                                                                     |
| zencrepes | Sends testing status to ZenCrepes with the objective of building a testing matrix for dependencies                                                            |

## Development

To add a new command, simply create the corresponding `.ts` file in the `./src/commands/` folder.

```
yarn
./bin/run YourCommand --help
```

## Usage

### With NPM

```
npm install -g jahia-reporter@latest
jahia-reporter testrail --help
```

### With Docker

```
docker run jahia/jahia-reporter:latest jahia-reporter slack --help
```
