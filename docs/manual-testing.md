# Overview

This section of the documentation provide instructions for testing manually the various jahia-repoprter commands.

## Help

No particular parameters to be provided here, the help command should display all of the commands available in jahia-reporter

```
./bin/run.mjs --help
```

## Github

### Incident

## Pagerduty

### Incident

This command will be deprecated/removed as soon as we've migrated to github issue based incidents.

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

## Perfs

These commands are primariraly used by https://github.com/Jahia/core-perf-test-terraform to analyze and submit performance tests results.

You will need the secret: ZENCREPES_WEBHOOK_SECRET

### Submit

The submit command requires the ZENCREPES_WEBHOOK_SECRET secret available at https://it.jahia.com/index.php/pwd/view/2335

```bash
export ZENCREPES_WEBHOOK_SECRET="CHANGE_ME"
```

PS: Don't forget to encode it, the current password contains special characters that will not be handled otherwise by bash, you can encode it using: `python3 -c 'import urllib.parse; print(urllib.parse.quote("CHANGE_ME"))'`

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

### Analyze

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

### History

The history command takes a folder containing previous runs (to be more specific, previous outputs from the `perfs:analyze` command) and generate a table view of past executions.

Such runs are stored at this location: https://github.com/Jahia/core-perf-test-terraform/tree/main/runs_history/

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

## Testrail

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

## Utils

### Alive

Wait until able to perform a GraphQL query to get the current EDIT workspace.

```bash
./bin/run.mjs utils:alive \
  --jahiaUrl="http://localhost:8080" \
  --jahiaUsername="root" \
  --jahiaPassword="root1234"

2025-10-21T14:18:53.675Z - Time since start: 0 ms
Waiting for Jahia to be online... Jahia became reachable after 170 ms
```
