# jahia-reporter

Using Mocha JSON or JEST/JUNIT XML as input, jahia-reporter is a CLI tool built with [OCLIF](https://oclif.io/) to various perform actions following a test execution (send results to testrail, to slack, ...).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![Downloads/week](https://img.shields.io/npm/dw/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![License](https://img.shields.io/npm/l/jahia-testrail-reporter.svg)](https://github.com/VladRadan/jahia-testrail-reporter/blob/master/package.json)

## Application Design

The main idea is to ingest a diverse set of test reports (Junit XML, mocha) and import those in a common data model. The data can then be manipulated/processed by various utilities to obtain a standardized, platform-agnostic output.

For example, if slack notifications are sent by Bamboo, CircleCI, GitHub Actions, ... following tests executions, all will look slightly different in their output, with different capabilities when it comes to the content of the message being sent. With Jahia-reporter, those can be standardized to one common messaging, no matter which platform the tests were executed in.

Additional data ingesters can easily be added to process test results from more sources.

## Data Model

If you need to design another ingester, or another command making use of the ingested data, you can find the exact specs of the model in `src/global.type.ts` (interfaces pre-fixed with JR).

The model is composed of the following levels:

* __JRRun__: A Jahia Reporter run, composed of multiple reports
* __JRReport__: A report is composed of multiple test suites
* __JRTestsuite__: A test suite is composed of multiple test cases
* __JRTestcase__: A test case is composed of 0 or more failures
* __JRTestfailure__: Failure in one of the test

The most important piece of analysis is __JRTestcase__ which is an individual test that has the status `PASS` or `FAIL` depending of the presence of failures. From that point on, all metrics are bubbled-up all the way to JRRun.

## Available Commands

Main commands are stored under `src/commands`, those commands must all make use of the data model and use test report as their primary data source. 
Utilities commands are available in `src/commands/utils`, those are performing satellite activities (such as fetching installed modules versions).

More details can be obtained about all of the commands by using `--help` with the command (or by looking at the source code).

### Testrail

Given an existing project name, submit data to testrail. All of the missing elements (milestones, runs, cases) are automatically created if non-existing. Projects are not automatically created.

### Slack

Given a Slack webhook, submit a formatted message to slack to report about test execution status.

Sample:
```
Test summary for: MODULE_NAME - 35 tests - 4 failures
Suite: TEST-org.jahia.test.graphql.GraphQLPublicationTest.xml - 6 tests - 4 failures
 |-- shouldPublishNoSubtree(org.jahia.test.graphql.GraphQLPublicationTest) (5s) - 2 failures 
 |-- shouldGetErrorNotRetrieveAggregatedPublicationInfoFromLive(org.jahia.test.graphql.GraphQLPublicationTest) (3s) - 2 failures 
```

Various parameters are available to customize the message (notification icon, ...), notify particular individuals, ...

### ZenCrepes

Given a ZenCrepes webhook, sends the outcome of a test run to ZenCrepes with the objective of building a test matrix of all latest runs for all possible combinations (Augmented Search 2.1.0, tested on 2020-08-10, with Jahia 8.0.1.0 and Elasticsearch 7.8.0).

### Utils

#### modules

Given a Jahia host (and credentials), fetches the Jahia version (and build number) and version of all modules and save this results in a JSON file. Data model used is detailed here: `src/global.type.ts`

This file can then be used as input for other Jahia-Repoter first-level commands.

## Development

To add a new command, simply create the corresponding `.ts` file in the `./src/commands/` folder.

```
yarn
./bin/run yourcommand --help
```

If adding a utility, please add this into the `utils` folder

### Release

CI/CD on this repository is performed with GitHub actions, publication to NPM and building of the docker images can be done by creating a release in GitHub(with three digit versioning).

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

Since the tool takes actual files as primary input, it is necessary to make them available to the tool during the run, this can be done by mounting the volume like this:

```
docker run --rm -v $PWD/junit/json2:/root/:ro jahia/jahia-reporter:latest /bin/bash -c "jahia-reporter slack /root/ WEBHOOK_URL -t json -u http://www.circleci.com -n \<@SLACK_USERNAME\> -w jahia -m augmented-search"
```

