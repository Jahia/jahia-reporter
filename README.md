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

- **JRRun**: A Jahia Reporter run, composed of multiple reports
- **JRReport**: A report is composed of multiple test suites
- **JRTestsuite**: A test suite is composed of multiple test cases
- **JRTestcase**: A test case is composed of 0 or more failures
- **JRTestfailure**: Failure in one of the test

The most important piece of analysis is **JRTestcase** which is an individual test that has the status `PASS` or `FAIL` depending of the presence of failures. From that point on, all metrics are bubbled-up all the way to JRRun.

# Available Commands

Main commands are stored under `src/commands`, those commands must all make use of the data model and use test report as their primary data source.
Utilities commands are available in `src/commands/utils`, those are performing satellite activities (such as fetching installed modules versions).

More details can be obtained about all of the commands by using `--help` with the command (or by looking at the source code).

## github:incident

The goal of this command is to create/update GitHub issues based on test results whose primary goal is to alert a team about failing tests.

Issues are assigned to users and project boards based on a configuration stored in a google spreadsheet (link: https://docs.google.com/spreadsheets/d/1pkU_t_wrdeIXnQAwnExHtu81cZUfH2HIZKOrDCKbolg/edit?gid=0#gid=0).

A deduplication key (dedup key) is generated for each incident to avoid duplicate issues being created for the same test failure.

When running, the command will search for all existing issues (OPEN or CLOSED) for that service within the provide repository.

- If it does not find any existing GitHub Issues and failures are present in the test report, it will create a new GitHub Issue
- If existing GitHub Issues are found for the service:
  - If there are no failures in the test report, it will close all OPEN GitHub Issues for that service
  - If failures are present:
    - It will search for CLOSED GitHub Issues matching the dedup key, if found, it will re-open the most recent one
    - If no matching closed issues are found, it will create a new issue

Finally, if an issue was created or re-opened, it will be updated on a GitHub Project board based on the configuration specified in the google spreadsheet.

### Try it

Secrets to access the google spreadsheet are located here: https://it.jahia.com/index.php/pwd/view/2335

This command takes the following parameters:

- GITHUB_TOKEN: A GitHub personal api token with correct permissions to create issues in a repository
- INCIDENT_GOOGLE_PRIVATE_KEY_BASE64: A **base64 encoded** version of the private key. The secret in it.jahia.coml is not base64 encoded.
- INCIDENT_GOOGLE_CLIENT_EMAIL: The user email
- INCIDENT_GOOGLE_SPREADSHEET_ID: The ID of the spreadsheet, this can also be obtained by looking at the URL
- PATH_TO_REPORT_FILE: A path to a folder (or individual file) containing test results, this can be easily obtained by downloading artifacts from a previous test run, for example [from here](https://github.com/Jahia/jahia-ee/actions/workflows/nightly.yml).

```bash
export GITHUB_TOKEN="CHANGE_MD"
export INCIDENT_GOOGLE_PRIVATE_KEY_BASE64="CHANGE_MD"
export INCIDENT_GOOGLE_CLIENT_EMAIL="CHANGE_MD"
export INCIDENT_GOOGLE_SPREADSHEET_ID="1pkU_t_wrdeIXnQAwnExHtu81cZUfH2HIZKOrDCKbolg"
export PATH_SOURCE_XML_REPORTS="./test-data/results-failure/xml_reports/"
```

```bash
./bin/run.mjs github:incident \
  --githubRepository=Jahia/sandbox \
  --incidentService=testnotif2 \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}" \
  --sourceUrl=http://some.url.jahia.com/run/1234

Google Spreadsheet ID is set to: 1pkU_t_wrdeIXnQAwnExHtu81cZUfH2HIZKOrDCKbolg
Connecting to spreadsheet: 1/3
Loaded spreadsheet: Global view - Repositories, Modules, Ownership
Reviewing sheet with title: Repositories
Reviewing sheet with title: Releases
Reviewing sheet with title: Pagerduty <- SHEET FOUND
Searching for row matching service: testnotif2
Found service testnotif2 at row number: 153
Updated service testnotif2 located at row number: 153
Assignee is set to [REPO_CHAMPION], its value will be fetched from the repository custom properties (Champion field)
Incident Content:
{
  counts: { fail: 1, skip: 0, success: 158, total: 159 },
  dedupKey: '350a1efb-1f19-5a49-a312-3e853acbbdcf',
  description: 'Total Tests: 159 - Failure: 1 (skipped: 0, pending: 0) - Executed in 1156s\n' +
    'FAILURES:\n' +
    ' | Suite: Mocha Tests - Total tests: 3 - Failure: 1 - Executed in 10s\n' +
    ' |   | - Absence of errors in SAM\n' +
    ' |   |    | - FAIL: Absence of errors in SAM Check that SAM Jahia errors probe is present with GREEN status',
  service: 'testnotif2',
  sourceUrl: 'http://www.google.com',
  title: 'testnotif2 - 1/159 FAILED test during test execution',
  assignee: 'Fgerthoffert'
}
Starting GitHub Incident creation process
Found 1 issues for service testnotif2
Total number of existing issues for service testnotif2: 1
Number of issues CLOSED referencing dedupKey 350a1efb-1f19-5a49-a312-3e853acbbdcf: 0
Matching issue []
```

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
npm install
./bin/run yourcommand --help
```

If adding a utility, please add this into the `utils` folder

### Code Quality and Linting

This project uses [Super Linter](https://github.com/super-linter/super-linter) to ensure code quality and consistency. The linting configuration includes:

- TypeScript/JavaScript linting with ESLint
- JSON and YAML validation
- Markdown linting
- Dockerfile linting
- GitHub Actions workflow validation

#### Running Linter Locally

To run the super-linter locally before submitting a PR:

```bash
# Make sure Docker is installed and running
./scripts/lint-local.sh
```

This will run the same linting checks that are executed in the CI pipeline.

#### Manual Linting

You can also run specific linters manually:

```bash
# Run ESLint on TypeScript files
npm run lint

# Run tests
npm test

# Build the project
npm run build
```

### Release

CI/CD on this repository is performed with GitHub actions, publication to NPM and building of the docker images can be done by creating a release in GitHub(with three digit versioning).

## Usage

### With NPM

```
npm install -g @jahia/jahia-reporter@latest
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

## Manual Testing

Although some automated tests are implemented, they do not cover all use cases, in particular when it comes to testing communication with external services.

You will find a dedicated readme refering to manual testing of the OCLIF commands in the "docs/" folder.
