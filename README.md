# jahia-reporter

Using Mocha JSON or JEST/JUNIT XML as input, jahia-reporter is a CLI tool built with [OCLIF](https://oclif.io/) to various perform actions following a test execution (send results to testrail, to slack, ...).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![Downloads/week](https://img.shields.io/npm/dw/jahia-testrail-reporter.svg)](https://npmjs.org/package/jahia-testrail-reporter)
[![License](https://img.shields.io/npm/l/jahia-testrail-reporter.svg)](https://github.com/VladRadan/jahia-testrail-reporter/blob/master/package.json)

## Table of Contents

- [Application Design](#application-design)
- [Data Model](#data-model)
- [Available Commands](#available-commands)
  - [github:incident](#githubincident)
  - [pagerduty:incident](#pagerdutyincident)
  - [perfs](#perfs)
  - [perfs:analyze](#perfsanalyze)
  - [perfs:history](#perfshistory)
  - [perfs:submit](#perfssubmit)
  - [testrail](#testrail)
  - [slack](#slack)
  - [summary](#summary)
  - [zencrepes](#zencrepes)
  - [utils:alive](#utilsalive)
  - [utils:checkreport](#utilscheckreport)
  - [utils:modules](#utilsmodules)
  - [utils:sam](#utilssam)
- [Development](#development)
  - [Code Quality and Linting](#code-quality-and-linting)
    - [Running Linter Locally](#running-linter-locally)
    - [Manual Linting](#manual-linting)
  - [Release](#release)
- [Usage](#usage)
  - [With NPM](#with-npm)
  - [With Docker](#with-docker)
- [Manual Testing](#manual-testing)

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

```
./bin/run.mjs --help
```

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

## pagerduty:incident

The pagerduty:incident was the command previously used to create incidents in PagerDuty in case of test failures. It is being replaced by "github:incident" (thus not much documentation will be provided).

It remains present to smooth the migration, but should be considered deprecated and will be removed in future versions.

### Try it

```bash
export INCIDENT_PAGERDUTY_API_KEY="CHANGE_MD"
export INCIDENT_PAGERDUTY_REPORTER_EMAIL="CHANGE_MD"
export INCIDENT_PAGERDUTY_REPORTER_ID="CHANGE_MD"
export INCIDENT_GOOGLE_PRIVATE_KEY_BASE64="CHANGE_MD"
export INCIDENT_GOOGLE_CLIENT_EMAIL="CHANGE_MD"
export INCIDENT_GOOGLE_SPREADSHEET_ID="1pkU_t_wrdeIXnQAwnExHtu81cZUfH2HIZKOrDCKbolg"
export PATH_SOURCE_XML_REPORTS="./test-data/results-success/xml_reports/"
```

```bash
./bin/run.mjs pagerduty:incident \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}"\
  --sourceType=xml \
  --pdTwoStepsAssign \
  --googleUpdateState \
  --service=jcustomer2 \
  --sourceUrl="http://some.url.jahia.com/run/1234"
```

## perfs:submit

The perfs commands are primariraly used by https://github.com/Jahia/core-perf-test-terraform to analyze and submit performance tests results.

You will need the secret: ZENCREPES_WEBHOOK_SECRET available at https://it.jahia.com/index.php/pwd/view/2335

Note that you'll need to encode the secret as it contains special characters that will not be handled otherwise by bash, you can encode it using: `python3 -c 'import urllib.parse; print(urllib.parse.quote("CHANGE_ME"))'`

### Try it

```bash
export ZENCREPES_WEBHOOK_SECRET="CHANGE_ME"
```

```bash
./bin/run.mjs perfs:submit \
  --webhook="https://zencrepes.jahia.com/zqueue/perfs/webhook" \
  --webhookSecret=${ZENCREPES_WEBHOOK_SECRET} \
  --runsFile="./test-data/jmeter-runs.json" \
  --tfsettingsFile="../core-perf-test-terraform/terraform/tfsettings.yaml" \
  --runName="Jahia Core Perf - j8sn-jsx" \
  --repoUrl="Jahia/core-perf-test-terraform" \
  --runUrl="https://github.com/Jahia/core-perf-test-terraform/actions/runs/18549891152/job/52891151094"

{
  name: 'Jahia Core Perf - j8sn-jsx',
  platform: { region: 'us-west-2', tenant: 'jahia-sandbox', vendor: 'AWS' },
  repository: {
    name: 'core-perf-test-terraform',
    owner: { login: 'Jahia', url: 'https://github.com/Jahia' },
    url: 'Jahia/core-perf-test-terraform'
  },
  ... TRUNCATED ...
  runs: [
    { name: 'Jahia Perf at 15mn', duration: 15, statistics: [Array] },
    { name: 'Jahia Perf at 30mn', duration: 30, statistics: [Array] },
    { name: 'Jahia Perf at 45mn', duration: 45, statistics: [Array] },
    { name: 'Jahia Perf at 60mn', duration: 60, statistics: [Array] },
    { name: 'Jahia Perf at 75mn', duration: 75, statistics: [Array] },
    { name: 'Jahia Perf at 90mn', duration: 90, statistics: [Array] },
    { name: 'Jahia Perf at 105mn', duration: 105, statistics: [Array] },
    { name: 'Jahia Perf at 120mn', duration: 120, statistics: [Array] },
    { name: 'Jahia Perf at 135mn', duration: 135, statistics: [Array] },
    { name: 'Jahia Perf at 150mn', duration: 150, statistics: [Array] }
  ],
  startedAt: '2025-10-16T05:23:58Z',
  tags: [ { name: 'Jahia 8.2.3.0-SNAPSHOT' } ]
}
```

## perfs:analyze

The goal of this command is to check if any of the transactions is above a specified threshold

### Try it

The analysis command takes three paths:

- PATH_TO_RUNS_FILE: This json file is the ouput of a performance test run, it is available as test artifacts from run executed on: https://github.com/Jahia/core-perf-test-terraform
- PATH_TO_THRESHOLD_FILE: This is the path to a file from the core-perf-test-terraform repository containing thresholds above which errors should be raised.
- PATH_TO_REPORT_FILE: This is the file where the output of the command will be stored.

```bash
export PATH_TO_RUNS_FILE="./test-data/jmeter-runs.json"
export PATH_TO_THRESHOLD_FILE="../core-perf-test-terraform/thresholds-runs.json"
export PATH_TO_REPORT_FILE="./test-data/perf-analysis.json"
```

```bash
./bin/run.mjs perfs:analyze \
  --runsFile="${PATH_TO_THRESHOLD_FILE}" \
  --thresholdsFile=${PATH_TO_THRESHOLD_FILE} \
  --reportFile=${PATH_TO_REPORT_FILE}

Starting analysis
More details about the threshold format can be found at: https://github.com/Jahia/core-perf-test
Analyzing run: Jahia Perf at 15mn, using threshold: *
Analyzing run: Jahia Perf at 30mn, using threshold: *
Analyzing run: Jahia Perf at 45mn, using threshold: *
Analyzing run: Jahia Perf at 60mn, using threshold: *
Analyzing run: Jahia Perf at 75mn, using threshold: *
Analyzing run: Jahia Perf at 90mn, using threshold: *
Analyzing run: Jahia Perf at 105mn, using threshold: *
Analyzing run: Jahia Perf at 120mn, using threshold: Jahia Perf at 120mn
Analyzing run: Jahia Perf at 135mn, using threshold: *
Analyzing run: Jahia Perf at 150mn, using threshold: *
Saving report to: ./test-data/perf-analysis.json
The following values were failing threshold:
ERROR: run: Jahia Perf at 120mn, transaction: E3-C9b Publish list page / Queue publish job+reload, metric: pct1ResTime is failing threshold => Value: 2043 (Operator: gt) Threshold: 1500
ERROR: run: Jahia Perf at 120mn, transaction: E3-U1d Edit news entry list page / Save+reload, metric: pct1ResTime is failing threshold => Value: 1502 (Operator: gt) Threshold: 1500
ERROR: run: Jahia Perf at 120mn, transaction: E3-C7b Add news entry / Save+reload, metric: pct1ResTime is failing threshold => Value: 1511 (Operator: gt) Threshold: 1500
ERROR: run: Jahia Perf at 120mn, transaction: E3-C8b Publish page / Queue publish job+reload, metric: pct1ResTime is failing threshold => Value: 1568 (Operator: gt) Threshold: 1500
ERROR: run: Jahia Perf at 120mn, transaction: E3-U2c Publish update / Queue publish job+reload, metric: pct1ResTime is failing threshold => Value: 2068 (Operator: gt) Threshold: 1500
```

## perfs:history

The history command takes a folder containing previous runs (to be more specific, previous outputs from the `perfs:analyze` command) and generate a table view of past executions.

Such runs are stored at this location: https://github.com/Jahia/core-perf-test-terraform/tree/main/runs_history/

### Try it

```bash
export PATH_ANALYSIS="../core-perf-test-terraform/runs_history/j8sn-jsx/"
```

```bash
./bin/run.mjs perfs:history \
  --analysisWindow=8 \
  --analysisFailureAlert=3 \
  --analysisPath="${PATH_ANALYSIS}"

Displaying errors for run: Jahia Perf at 120mn
* (Above threshold)

  ┌─────────────────────────────────────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬────────────┬───────────┐
  │                    Transactions                     │   Metric    │ 10/05-17:15 │ 10/05-23:11 │ 10/06-14:03 │ 10/06-19:04 │ 10/07-09:35 │ 10/09-07:28 │ 10/14-07:26 │ 10/16-07:23 │ Send Alert │ Threshold │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-C9b Publish list page / Queue publish job+reload │ pct1ResTime │       2012* │       2015* │       2086* │       1977* │        1270 │       2111* │       2015* │       2043* │        YES │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-U1d Edit news entry list page / Save+reload      │ pct1ResTime │       1777* │        1491 │        1500 │       1593* │        1267 │       1801* │       1597* │       1502* │        YES │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E2c View list page in edit mode                     │ pct1ResTime │       1415* │        1161 │        1160 │        1269 │        1032 │        1201 │        1179 │        1207 │         NO │      1400 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-C7b Add news entry / Save+reload                 │ pct1ResTime │       1843* │        1441 │        1304 │       1549* │        1357 │       1781* │       1510* │       1511* │        YES │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-U1d Edit rich text page / Save+reload            │ pct1ResTime │       1668* │        1362 │        1365 │        1395 │        1210 │        1401 │        1353 │        1337 │         NO │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-C8b Publish page / Queue publish job+reload      │ pct1ResTime │       1766* │        1358 │       1596* │       1594* │        1181 │       1639* │       1669* │       1568* │        YES │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-U2c Publish update / Queue publish job+reload    │ pct1ResTime │       2201* │       2044* │       1938* │       2066* │        1225 │       2067* │       2050* │       2068* │        YES │      1500 │
  ├─────────────────────────────────────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼────────────┼───────────┤
  │ E3-U1b Edit content / Close locked engine+reload    │ pct1ResTime │         985 │       1076* │         851 │         990 │         858 │       1326* │         976 │         715 │         NO │      1000 │
  └─────────────────────────────────────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴────────────┴───────────┘
Exiting with exit code: 1 (failed)
```

## testrail

Given an existing project name, submit data to testrail. All of the missing elements (milestones, runs, cases) are automatically created if non-existing.

Projects are not automatically created.

### Try it

Secrets to access Testrail are located here: https://it.jahia.com/index.php/pwd/view/2335

This parameters takes the following parameters:

- TESTRAIL_USERNAME: Account for testrail
- TESTRAIL_PASSWORD: Password for testrail
- PATH_SOURCE_XML_REPORTS: A path to a folder (or individual file) containing test results, this can be easily obtained by downloading artifacts from a previous test run, for example [from here](https://github.com/Jahia/jahia-ee/actions/workflows/nightly.yml).
- TESTRAIL_METADATA: A file that can be downloaded from a previous nightly run, for example [from here](https://github.com/Jahia/jahia-ee/actions/workflows/nightly.yml). These are metadata elements that are attached to testrail runs.

Sample Metadata content:

```json
{
  "custom_url": "https://github.com/Jahia/jahia-ee/actions/runs/19053732432",
  "version": "8.2.3.0-SNAPSHOT - Build: 6f1e237",
  "custom_database": "PostgreSQL - Version: 16.10",
  "custom_java": "OpenJDK Runtime Environment - Version: 17.0.16+8",
  "custom_os": "Linux (amd64) - Version: 6.8.0-1039-aws"
}
```

```bash
export TESTRAIL_USERNAME="CHANGE_ME"
export TESTRAIL_PASSWORD="CHANGE_ME"
export PATH_SOURCE_XML_REPORTS="./test-data/results-failure/xml_reports/"
export TESTRAIL_METADATA="./test-data/testrail-metadata.json"
```

Make sure to use a project that does exists in Testrail for the "--projectName" parameter.

```bash
./bin/run.mjs testrail \
  --testrailUsername="${TESTRAIL_USERNAME}" \
  --testrailPassword="${TESTRAIL_PASSWORD}" \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}" \
  --projectName="Sandbox Module" \
  --milestone="Default" \
  --defaultRunDescription="This test a sample run description" \
  --testrailCustomResultFields="${TESTRAIL_METADATA}" \
  --linkRunFile="/tmp/testrail-link.txt"

2025-10-21T14:18:53.675Z - Time since start: 0 ms
Waiting for Jahia to be online... Jahia became reachable after 170 ms
```

## slack

The slack command is deprecated, it does not submit slack message but instead prints a deprecation warning.

## summary

The summary command provides a brief overview of the test execution results, including the number of tests run, passed, and failed.

### Try it

```bash
export PATH_SOURCE_XML_REPORTS="./test-data/results-failure/xml_reports/"
```

```bash
./bin/run.mjs summary \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}"

Total Tests: 159 - Failure: 1 (skipped: 0, pending: 0) - Executed in 1156s
FAILURES:
 | Suite: Mocha Tests - Total tests: 3 - Failure: 1 - Executed in 10s
 |   | - Absence of errors in SAM
 |   |    | - FAIL: Absence of errors in SAM Check that SAM Jahia errors probe is present with GREEN status
```

## zencrepes

Given a ZenCrepes webhook, sends the outcome of a test run to ZenCrepes with the objective of building a test matrix of all latest runs for all possible combinations (Augmented Search 2.1.0, tested on 2020-08-10, with Jahia 8.0.1.0 and Elasticsearch 7.8.0).

Though not deprecated yet, we should aim at replacing it by features natively provided by test management platforms.

### Try it

```bash
export PATH_SOURCE_XML_REPORTS="./test-data/results-failure/xml_reports/"
export ZENCREPES_WEBHOOK_SECRET="CHANGE_ME"
```

```bash
./bin/run.mjs zencrepes \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}" \
  --webhook="https://zencrepes.jahia.com/zqueue/testing/webhook" \
  --webhookSecret="${ZENCREPES_WEBHOOK_SECRET}" \
  --name="testService"
```

The command displays the JSON object submitted to ZenCrepes.

## utils:alive

Wait until being able to perform a GraphQL query to get the current EDIT workspace.

### Try it

```bash
./bin/run.mjs utils:alive \
  --jahiaUrl="http://localhost:8080" \
  --jahiaUsername="root" \
  --jahiaPassword="root1234"

2025-10-21T14:18:53.675Z - Time since start: 0 ms
Waiting for Jahia to be online... Jahia became reachable after 170 ms
```

## utils:checkreport

Previously useful for debugging, displays all tests results and their status

### Try it

```bash
export PATH_SOURCE_XML_REPORTS="./test-data/results-failure/xml_reports/"
```

```bash
./bin/run.mjs utils:checkreport \
  --sourcePath="${PATH_SOURCE_XML_REPORTS}"


Root Stats => Tests: 159 Failures: 1 Time: 1156 Reports count: 44
[0] Report: Mocha Tests => Tests: 9 Failures: 0 Time: 15 Suites count: 2
[0][0] Suite: Provisioning operations validation for non-Jahia module bundles => Failures: 0 Time: 0 Timestamp: 2025-10-15T01:07:37 Tests count: 6
[0][0][0] Test: Provisioning operations validation for non-Jahia module bundles Should reject provisioning operation: installBundle on non-Jahia module bundle => Failures: 0 Time: 0 Status: PASS
[0][0][1] Test: Provisioning operations validation for non-Jahia module bundles Should reject provisioning operation: installModule on non-Jahia module bundle => Failures: 0 Time: 0 Status: PASS
...
```

## utils:modules

Given a Jahia host (and credentials), fetches the Jahia version (and build number) and version of all modules and save this results in a JSON file. Data model used is detailed here: `src/global.type.ts`

The generated JSON file can then be used as input for other Jahia-Repoter first-level commands.

### Try it

```bash
export JAHIA_URL="http://localhost:8080"
export JAHIA_USERNAME="root"
export JAHIA_PASSWORD="root1234"
```

```bash
./bin/run.mjs utils:modules --jahiaUrl="${JAHIA_URL}" --jahiaUsername="${JAHIA_USERNAME}" --jahiaPassword="${JAHIA_PASSWORD}" --moduleId=sitemap --dependencies=tools,tasks --filepath=./test-data/modules.json

Waiting for Jahia journal to be in-sync at: http://localhost:8080/
Done waiting for journal sync
Fetched full details about the platform
```

## utils:sam

Given a Jahia host, wait until SAM returns GREEN status for the provided severity (default to MEDIUM).

It not only waits for a single GREEN status, but will actually wait for a number of consecutive GREEN statuses (default to 10) to avoid transient states.

This can be customized with the following parameters:

- interval (default: 2): Number of seconds between each SAM status check
- severity (default: MEDIUM): Severity level to check for (LOW, MEDIUM, HIGH)
- greenMatchCount (default: 10): Number of consecutive GREEN status required to consider SAM as healthy
- timeout (default: 120): Maximum number of seconds to wait before failing

Note that timeout is for the entire runtime, so if interval=2 and greenMatchCount=10, the script will take 20 seconds to reach the 10 green status. But since you might actually be waiting for a server startup, or for some operations to complete, the timeout should be considerably higher.

The main goal for this utility is to be used in CI pipelines to ensure that SAM is healthy before proceeding with test execution. In such a case, the timeout is there to avoid running the workflow job until it reaches its own timeout.

For example:

- if your overall test execution is taking on average 45mn,
- if your workflow job timeout is set to 60mn
- if you expect the tests to ALWAYS start within 5mn of triggering Jahia starteup
  Then you can set a timeout of 5mn (300s).
  In such a case, if Jahia fails to start properly (or fail to provision properly), then your job will begin shutting down after 5mn instead of waiting for the full 60mn job timeout.

### Try it

```bash
export JAHIA_URL="http://localhost:8080"
export JAHIA_USERNAME="root"
export JAHIA_PASSWORD="root1234"
```

Sample (with SAM failure):

```bash
./bin/run.mjs utils:sam --jahiaUrl="${JAHIA_URL}" --jahiaUsername="${JAHIA_USERNAME}" --jahiaPassword="${JAHIA_PASSWORD}" --timeout=15

Waiting for SAM status GREEN with severity MEDIUM (timeout: 15s)
[2026-01-06T15:50:23.959Z] Status: RED (elapsed: 0s -- timeout: 15s)
[2026-01-06T15:50:26.002Z] Status: RED (elapsed: 2s -- timeout: 15s)
[2026-01-06T15:50:28.042Z] Status: RED (elapsed: 4s -- timeout: 15s)
[2026-01-06T15:50:30.073Z] Status: RED (elapsed: 6s -- timeout: 15s)
[2026-01-06T15:50:32.112Z] Status: RED (elapsed: 8s -- timeout: 15s)
[2026-01-06T15:50:34.151Z] Status: RED (elapsed: 10s -- timeout: 15s)
[2026-01-06T15:50:36.215Z] Status: RED (elapsed: 12s -- timeout: 15s)
[2026-01-06T15:50:38.288Z] Status: RED (elapsed: 14s -- timeout: 15s)
SAM failed to reach GREEN status. Health check payload:

Probes with issues:
- ModuleState (MEDIUM): RED - At least one module is not started. Module javascript-modules-engine is in Installed state.
```

# Development

To add a new command, simply create the corresponding `.ts` file in the `./src/commands/` folder.

```
npm install
./bin/run yourcommand --help
```

If adding a utility, please add this into the `utils` folder

## Code Quality and Linting

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
