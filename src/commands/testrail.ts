/* eslint max-depth: ["error", 5] */
import { Command, Flags, ux } from '@oclif/core';
import { formatToTimeZone } from 'date-fns-timezone';
import * as fs from 'node:fs';

import { JRRun } from '../global.type';
import ingestReport from '../utils/ingest/index.js';

import {
  AddCase,
  AddRun,
  Run,
  Section,
  Status,
  Test,
  TestRailResult,
  TestWithStatus,
} from '../utils/testrail.interface.js';

import {
  parseTestsFromReports,
  createTestrailConfig,
  getTestrailProject,
  getTestrailSections,
  getTestrailParentSection,
  addTestrailSection,
  getTestrailMilestones,
  addTestrailMilestone,
  getTestrailCustomFields,
  getTestrailCustomStatus,
  getTestrailCustomVersion,
  getTestrailCases,
  addTestrailCase,
  addTestrailRun,
  closeTestrailRun,
  addTestrailResults,
  getTestrailSuite,
} from '../utils/testrail/index.js';

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

    // In most cases, the expected format for runs in testrail is
    // AE - <projectName>-<date>
    // If the runName is not default, then it's up to the user to format the runName
    // in a way that would make it possible to differentiate it from others in testrail
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

    this.log(`Will be creating a Testrail run with name: ${flags.runName}`);

    // Parse the test results from the provided report files
    const jrRun: JRRun = await ingestReport(
      flags.sourceType,
      flags.sourcePath,
      this.log.bind(this),
    );

    // Format the test in a way that can be processed for testrail
    // This takes the nested structure of JRRun and flattens it into a list of tests with status
    const tests: TestWithStatus[] = parseTestsFromReports(
      jrRun,
      this.log.bind(this),
    );

    // Create a testrail configuration object that will be passed to all subsequent
    // calls to testrail
    const testrailConfig = createTestrailConfig({
      base: flags.testrailUrl,
      username: flags.testrailUsername,
      password:
        flags.testrailApiKey === undefined
          ? flags.testrailPassword
          : flags.testrailApiKey,
    });

    // Fetch the project from Testrail
    // The command will not attempt to create a project if it doesn't exist
    const testrailProject = await getTestrailProject(
      testrailConfig,
      flags.projectName,
      this.log.bind(this),
    );

    // Fetch the suite from Testrail within the provided project
    // The command will not attempt to create a suite if it doesn't exist
    const testrailSuite = await getTestrailSuite(
      testrailConfig,
      testrailProject,
      flags.suiteName,
      this.log.bind(this),
    );

    ux.action.start(
      `Fetching sections from project ID: ${testrailProject.id} and suite ID: ${testrailSuite.id}`,
    );
    let testrailSections = await getTestrailSections(
      testrailConfig,
      testrailProject.id,
      testrailSuite.id,
    );
    ux.action.stop(`${testrailSections.length} sections fetched`);

    // Fetch the parent section if provided
    // If a parent section is not found, it will be created
    // If no parent section is provided, null is returned
    const parentSection = await getTestrailParentSection(
      testrailConfig,
      flags.parentSection,
      testrailProject,
      testrailSuite,
      testrailSections,
      this.log.bind(this),
    );

    // If a parent section was created, make sure it's in the list of sections
    // if not, add it
    if (
      parentSection !== null &&
      testrailSections.find((s) => s.id === parentSection.id) === null
    ) {
      testrailSections.push(parentSection);
    }
    const parentSectionId =
      parentSection !== null ? parentSection.id.toString() : '';

    // Get Milestone
    ux.action.start(
      `Fetching milestones from project ID: ${testrailProject.id}`,
    );
    let testrailMilestones = await getTestrailMilestones(
      testrailConfig,
      testrailProject.id,
    );
    ux.action.stop(`${testrailMilestones.length} milestones fetched`);
    let testrailMilestone = testrailMilestones.find(
      (milestone) => milestone.name === flags.milestone,
    );

    if (testrailMilestone === undefined) {
      if (flags.skip) {
        testrailMilestone = {
          id: -1,
          project_id: testrailProject.id,
          name: flags.milestone,
          url: '',
        };
        this.log(`Milestone: ${flags.milestone}`);
      } else {
        this.log(
          `Adding milestone to project: ${testrailProject.id}, milestone: ${flags.milestone}`,
        );
        testrailMilestone = await addTestrailMilestone(
          testrailConfig,
          testrailProject.id,
          flags.milestone,
        );
      }
    }
    if (testrailMilestone === undefined) {
      this.error(`Failed to create or find milestone: ${flags.milestone}`);
    }

    this.log(
      `Using milestone ${testrailMilestone.name} with id: ${testrailMilestone.id} and URL: ${testrailMilestone.url}`,
    );

    // Custom fields make it possible to add additional metadata to testrail results
    const testrailCustomFields = await getTestrailCustomFields({
      testrailCustomResultFields: flags.testrailCustomResultFields,
      config: testrailConfig,
      project: testrailProject,
      log: this.log.bind(this),
    });

    // In order to make sure that all the test cases exist in TestRail we need to first make sure all the sections exist
    const executedSections: Section[] = [];
    // Get all sections from the executed tests
    const executedSectionsNames: string[] = [
      ...new Set(tests.map((test) => test.section)),
    ];

    // Make sure those sections exist in TestRail
    for (const executedSectionName of executedSectionsNames) {
      const foundSectionInTestrail = testrailSections.find(
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
          const newSection = await addTestrailSection(
            testrailConfig,
            testrailProject.id,
            {
              parentId: parentSectionId,
              section: executedSectionName,
              suiteId: testrailSuite.id,
            },
          );
          executedSections.push(newSection);
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
        ux.action.start(
          `Get cases for section: ${executedSection.name} (id: ${executedSection.id})`,
        );
        testCasesInTestrail[executedSection.name] = await getTestrailCases(
          testrailConfig,
          testrailProject.id,
          testrailSuite.id,
          executedSection.id,
        );
        ux.action.stop(
          `${testCasesInTestrail[executedSection.name].length} cases fetched`,
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
          ux.action.start(
            `Test '${test.title}' was not found in TestRail. Creating it.`,
          );
          const customStatus = await getTestrailCustomStatus(
            testrailConfig,
            'Complete',
          );
          const customVersion = await getTestrailCustomVersion(
            testrailConfig,
            '8.0.1.0',
          );
          const newTestCase: AddCase = {
            custom_status: customStatus,
            custom_version: customVersion,
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
            const createdCase = await addTestrailCase(
              testrailConfig,
              section.id,
              newTestCase,
            );
            test.id = createdCase.id;
            ux.action.stop(`created (ID: ${createdCase.id})`);
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
      milestone_id: testrailMilestone.id,
      name: flags.runName,
      suite_id: testrailSuite.id,
    };
    let run = {} as Run;
    if (flags.skip) {
      this.log(`Created test run ${flags.runName}`);
    } else {
      run = await addTestrailRun(testrailConfig, testrailProject.id, newRun);
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
          `Will be pushing to testrail - Title: ${test.title} - case_id: ${test.id} - status_id: ${status_id}`,
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
    this.log(`Updating test run in batch for ${results.length} results`);
    if (flags.skip) {
      this.log(`Results: ${JSON.stringify(results)}`);
    } else {
      await addTestrailResults(testrailConfig, run.id, results);
    }

    this.log('Closing test run');
    if (!flags.skip) {
      await closeTestrailRun(testrailConfig, run.id);
    }

    this.log('All done!');
  }
}
