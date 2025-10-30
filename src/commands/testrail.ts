/* eslint max-depth: ["error", 5] */
import { Command, Flags } from '@oclif/core';
import { formatToTimeZone } from 'date-fns-timezone';
import * as fs from 'node:fs';
import { existsSync, lstatSync, readFileSync } from 'node:fs';

import { JRRun, JRTestfailure } from '../global.type';
import ingestReport from '../utils/ingest/index.js';
import {
  AddCase,
  AddRun,
  Project,
  ResultField,
  Run,
  Section,
  Status,
  Suite,
  Test,
  TestRailResult,
} from '../utils/testrail.interface.js';
import { TestRailClient } from '../utils/testrail.js';

interface TestWithStatus extends Test {
  status: string;
}

export default class TestrailCommand extends Command {
  static override description =
    'Submit data about a junit/mocha report to TestRail';

  static override flags = {
    defaultRunDescription: Flags.string({
      char: 'd',
      default: 'This test run was manually triggered',
      description: 'TestRail default run description',
    }),
    jahiaVersion: Flags.string({
      char: 'j',
      default: '8.0.1.0',
      description: 'Jahia/Module version',
    }),
    linkRunFile: Flags.string({
      default: '',
      description: 'Save the link to the run to a file',
    }),
    milestone: Flags.string({
      char: 'm',
      default: 'Default',
      description: 'TestRail milestone',
    }),
    parentSection: Flags.string({
      char: 'p',
      default: '',
      description: 'TestRail default run description',
    }),
    projectName: Flags.string({
      char: 'n',
      default: 'Jahia',
      description: 'TestRail Project name',
    }),
    runName: Flags.string({
      char: 'r',
      default: 'AE - ',
      description: 'TestRail run name',
    }),
    skip: Flags.boolean({
      default: false,
      description: 'Do not send the data but only print it to console',
    }),
    sourcePath: Flags.string({
      description:
        'A json/xml report or a folder containing one or multiple json/xml reports',
      required: true,
    }),
    sourceType: Flags.string({
      char: 't', // shorter flag version
      default: 'xml',
      description: 'The format of the report', // help description for flag
      options: ['xml', 'json'] as const, // only allow the value to be from a discrete set
    }),
    suiteName: Flags.string({
      char: 's',
      default: 'Master',
      description: 'TestRail suite name',
    }),
    testrailApiKey: Flags.string({
      description: 'TestRail to be used as an alternative to username/password',
      required: false,
    }),
    testrailCustomResultFields: Flags.string({
      default: '',
      description:
        'Path to a file containing values (in a key:value JSON object) to be added to the result fields',
    }),
    testrailPassword: Flags.string({
      description: 'TestRail password',
      required: true,
    }),
    testrailUrl: Flags.string({
      default: 'https://jahia.testrail.net',
      description: 'TestRail url to submit the results from the report to',
    }),
    testrailUsername: Flags.string({
      description: 'TestRail username',
      required: true,
    }),
  };

  // eslint-disable-next-line complexity
  public async run(): Promise<void> {
    const { flags } = await this.parse(TestrailCommand);

    if (flags.runName === 'AE - ') {
      const date = new Date();
      const format = 'YYYY-MM-DD HH:mm:ss [GMT]Z (z)';
      const runDate = formatToTimeZone(date, format, {
        timeZone: 'Europe/Paris',
      });
      flags.runName +=
        flags.parentSection === ''
          ? `${flags.projectName}-${runDate}`
          : `${flags.parentSection}-${runDate}`;
    }

    // Parse files into objects
    const jrRun: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
    );
    const tests: TestWithStatus[] = [];
    for (const report of jrRun.reports) {
      this.log(`- Analyzed report: ${report.name}`);
      for (const testsuite of report.testsuites) {
        this.log(`   |- Analyzed suite: ${testsuite.name}`);
        for (const test of testsuite.tests) {
          if (!test.name.includes('hook for')) {
            const sectionName = testsuite.name.includes('(')
              ? testsuite.name.slice(
                  0,
                  Math.max(0, testsuite.name.indexOf('(') - 1),
                )
              : testsuite.name;
            const testName = test.name.includes(sectionName)
              ? test.name.slice(Math.max(0, sectionName.length + 1))
              : test.name;
            const testToPush: TestWithStatus = {
              section: sectionName.trim(),
              status: test.status,
              steps: test.steps,
              time: test.time.toString(),
              title: testName.trim(),
            };
            if (test.failures.length > 0) {
              testToPush.comment =
                test.failures
                  .filter((f: JRTestfailure) => f !== undefined)
                  .map((f: JRTestfailure) => f.text)
                  .join(',') || test.failures.join(',');
            }

            this.log(
              `   |    |- Analyzed test: ${test.name} - Status: ${test.status}`,
            );
            tests.push(testToPush);
          }
        }
      }
    }

    const testrail = new TestRailClient(
      flags.testrailUrl,
      flags.testrailUsername,
      flags.testrailApiKey === undefined
        ? flags.testrailPassword
        : flags.testrailApiKey,
    );

    this.log('Get all testrail projects');
    // get the testrail project
    const testrailProject = testrail
      .getProjects()
      .find((project) => project.name === flags.projectName);
    if (testrailProject === undefined) {
      this.error(`Failed to find project named '${flags.projectName}'`);
    } else {
      testrailProject as Project;
    }

    // Get the testrail suite
    this.log(`Get all suites for project ${testrailProject.id}`);
    const testrailSuite = testrail
      .getSuites(testrailProject.id)
      .find((suite) => suite.name === flags.suiteName);
    if (testrailSuite === undefined) {
      this.error(
        `Failed to find suite named: '${flags.suiteName}' in project: '${flags.projectName}'`,
      );
    } else {
      testrailSuite as Suite;
    }

    // Get parent section from test rail if parent_section was set
    this.log(
      `Get all sections for project: ${testrailProject.id} and suite: ${testrailSuite.id}`,
    );
    let allSectionsInTestrail = testrail.getSections(
      testrailProject.id,
      testrailSuite.id,
    );
    let parentSectionId = '';
    if (flags.parentSection !== '') {
      let foundSection = allSectionsInTestrail.find(
        (section) => section.name === flags.parentSection,
      );
      if (foundSection === undefined) {
        this.log(
          `Failed to find section named '${flags.parentSection}' in project '${flags.projectName}'. Creating the section now.`,
        );
        foundSection = testrail.addSection(
          testrailProject.id,
          testrailSuite.id,
          flags.parentSection,
        );
        allSectionsInTestrail = testrail.getSections(
          testrailProject.id,
          testrailSuite.id,
        );
      }

      parentSectionId = foundSection.id.toString();
    }

    // Get Milestone
    this.log(`Get all milestones for project: ${testrailProject.id}`);
    const milestone: { id: number; name: string } | undefined = testrail
      .getMilestones(testrailProject.id)
      .find((milestone) => milestone.name === flags.milestone);
    let milestone_id = -1;
    if (flags.skip) {
      this.log(`Milestone: ${flags.milestone}`);
    } else {
      this.log(
        `Add milestone to project: ${testrailProject.id}, milestone: ${flags.milestone}`,
      );
      milestone_id = milestone
        ? milestone.id
        : testrail.addMilestone(testrailProject.id, flags.milestone).id;
    }

    this.log(`Using milestone ${flags.milestone} with id: ${milestone_id}`);

    let testrailCustomFields: ResultField[] = [];
    if (
      flags.testrailCustomResultFields !== undefined &&
      flags.testrailCustomResultFields !== ''
    ) {
      // Parse the provided json file
      if (!existsSync(flags.testrailCustomResultFields)) {
        throw new Error(
          `Something went wrong. The provided path: ${flags.testrailCustomResultFields} does not exist.`,
        );
      }

      if (!lstatSync(flags.testrailCustomResultFields).isFile()) {
        throw new Error(
          `Something went wrong. The provided path: ${flags.testrailCustomResultFields} is not a file`,
        );
      }

      this.log(
        `${flags.testrailCustomResultFields}, exists, parsing its content`,
      );
      const rawFile = readFileSync(flags.testrailCustomResultFields, 'utf8');
      const customFieldsSubmission = JSON.parse(rawFile.toString());

      // Get all configured Testrail custom fields for that account
      // Decorate it with value and project details
      this.log('Get all configured custom fields');
      testrailCustomFields = testrail.getResultFields().map((t) => {
        // See static type list here: https://support.gurock.com/hc/en-us/articles/7077871398036-Result-Fields
        const staticTypes = [
          '',
          'String',
          'Integer',
          'Text',
          'URL',
          'Checkbox',
          'Dropdown',
          'User',
          'Date',
          'Milestone',
          'Step Results',
          'Multi-select',
        ];
        let isEnabledOnProject = false;
        for (const c of t.configs) {
          if (
            c.context.is_global === true ||
            c.context.project_ids.includes(testrailProject.id)
          ) {
            isEnabledOnProject = true;
          }
        }

        // Search in the submission to find a match
        return {
          ...t,
          enabledOnProject: isEnabledOnProject, // Is that custom field valid for the current project
          type: staticTypes[t.type_id],
          value: customFieldsSubmission[t.system_name],
        };
      });
      // Finally, add the system fields (if present in the json file)
      if (customFieldsSubmission.version !== undefined) {
        testrailCustomFields.push({
          configs: [],
          description: 'Version (System field)',
          display_order: 1,
          enabledOnProject: true,
          id: 1000,
          include_all: 1,
          is_active: true,
          label: 'Version',
          name: 'Version (System)',
          system_name: 'version',
          template_ids: [],
          type: 'String',
          type_id: 1,
          value: customFieldsSubmission.version,
        });
      }

      this.log('The following custom fields are present on testrail:');
      // Display custom fields in JSON format for review
      this.log(JSON.stringify(testrailCustomFields, null, 2));
      testrailCustomFields = testrailCustomFields.filter(
        (f) => f.enabledOnProject === true,
      );
    }

    // In order to make sure that all the test cases exist in TestRail we need to first make sure all the sections exist
    const executedSections: Section[] = [];
    // Get all sections from the executed tests
    const executedSectionsNames: string[] = [
      ...new Set(tests.map((test) => test.section)),
    ];
    this.log('The following section names were found');
    for (const sectionName of executedSectionsNames) {
      this.log(sectionName);
    }

    // Make sure those sections exist in TestRail
    for (const executedSectionName of executedSectionsNames) {
      const foundSectionInTestrail = allSectionsInTestrail.find(
        (sectionInTestrail) =>
          sectionInTestrail.name === executedSectionName &&
          (sectionInTestrail.parent_id
            ? sectionInTestrail.parent_id.toString()
            : '') === parentSectionId,
      );

      if (foundSectionInTestrail === undefined) {
        this.log(
          `Section '${executedSectionName}' wasn't found. Creating it (project ID: ${testrailProject.id}, suite ID: ${testrailSuite.id}, section name: ${executedSectionName}, parent section ID: ${parentSectionId}).`,
        );
        if (!flags.skip) {
          executedSections.push(
            testrail.addSection(
              testrailProject.id,
              testrailSuite.id,
              executedSectionName,
              parentSectionId,
            ),
          );
        }
      } else {
        executedSections.push(foundSectionInTestrail);
      }
    }

    // Make sure all test cases exist in TestRail
    // First get all test cases from TestRail, by section
    const testCasesInTestrail: Record<string, Test[]> = {};
    for (const executedSection of executedSections) {
      if (!flags.skip) {
        this.log(
          `Get cases for project: ${testrailProject.id}, suite: ${testrailSuite.id}, section: ${executedSection.id}`,
        );
        testCasesInTestrail[executedSection.name] = testrail.getCases(
          testrailProject.id,
          testrailSuite.id,
          executedSection.id,
        );
      }
    }

    // Go over the executed tests and make sure they all exist in the list we just got from TestRail
    for (const test of tests) {
      if (flags.skip) {
        this.log(`Get test data ${JSON.stringify(test)}`);
      } else {
        // See if test exists in TestRail
        const foundTestCaseInTestRail = testCasesInTestrail[test.section].find(
          (t) => t.title === test.title,
        );
        // if it's not found we are creating it
        if (foundTestCaseInTestRail === undefined) {
          this.log(
            `Test '${test.title}' was not found in TestRail. Creating it.`,
          );
          const newTestCase: AddCase = {
            custom_status: testrail.getCustomStatus('Complete'),
            custom_version: testrail.getCustomVersion('8.0.1.0'),
            title: test.title,
          };
          // Only Cypress reports at the moment are expected to have the steps field
          if (test.steps !== undefined) {
            newTestCase.custom_steps_separated = [
              {
                content: test.steps,
                expected: '',
              },
            ];
          }

          // Find the section ID of that that test belongs to
          const section = executedSections.find(
            (section) => section.name === test.section,
          );
          if (section === undefined) {
            this.error(
              `Something unexpected happened. Section ${test.section} was not found and not created.`,
            );
          } else {
            test.id = testrail.addCase(section.id, newTestCase).id;
          }
        } else {
          // the test exists in TestRail, so we'll just keep the ID
          test.id = foundTestCaseInTestRail.id;
        }
      }
    }

    // Get all the case ids. Required for creating the run
    const caseIds = tests.map((t) => t.id);

    // Create test run
    const newRun: AddRun = {
      case_ids: caseIds,
      description: flags.defaultRunDescription,
      include_all: false,
      milestone_id,
      name: flags.runName,
      suite_id: testrailSuite.id,
    };
    let run = {} as Run;
    if (flags.skip) {
      this.log(`Created test run ${flags.runName}`);
    } else {
      run = testrail.addRun(testrailProject.id, newRun);
      this.log(
        `Created test run ${run.id.toString()} (https://jahia.testrail.net/index.php?/runs/view/${run.id.toString()})`,
      );
      if (flags.linkRunFile !== '') {
        fs.writeFileSync(
          flags.linkRunFile,
          `https://jahia.testrail.net/index.php?/runs/view/${run.id.toString()}`,
        );
      }
    }

    // Create the results object
    const results: TestRailResult[] = [];
    for (const test of tests) {
      if (test.id === undefined) {
        this.error(
          `Something unexpected happened. Test ${test.title} does not have an ID.`,
        );
      } else {
        // If there's a comment argument on the object it means the test failed.
        let status_id: Status = 5;
        if (test.status === 'PASS') {
          status_id = 1;
        } else if (['PENDING', 'SKIP'].includes(test.status)) {
          // Passing status "blocked" since `3: Untested ` is not supported
          // See: https://www.gurock.com/testrail/docs/api/reference/results/#addresult
          status_id = 2;
        }

        // const status_id: Status = test.comment === undefined ? Status.Passed : Status.Failed
        const testResult: TestRailResult = {
          case_id: test.id,
          elapsed: test.time,
          status_id,
          version: flags.jahiaVersion,
        };
        if (status_id === Status.Failed) {
          testResult.comment = test.comment;
        }

        this.log(
          `Puhsing to testrail - Title: ${test.title} - case_id: ${test.id} - status_id: ${status_id}`,
        );

        // Adding custom fields when applicable
        if (testrailCustomFields.length > 0) {
          for (const f of testrailCustomFields) {
            testResult[f.system_name] = f.value;
          }
        }

        results.push(testResult);
      }
    }

    // Bulk update results
    this.log('Updating test run');
    if (flags.skip) {
      this.log(`Results: ${JSON.stringify(results)}`);
    } else {
      testrail.addResults(run.id, results);
    }

    this.log('Closing test run');
    if (!flags.skip) {
      testrail.closeRun(run.id);
    }
  }
}
