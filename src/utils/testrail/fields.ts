import { ux } from '@oclif/core';
import { existsSync, lstatSync, readFileSync } from 'node:fs';

import type { TestRailConfig } from '../testrail.interface.js';

import { CaseFields, Project, ResultField } from '../testrail.interface.js';
import { sendRequest } from './client.js';

export const getTestrailResultFields = async (
  config: TestRailConfig,
  project: Project,
  customFieldsSubmission: { [key: string]: boolean | number | string },
): Promise<ResultField[]> => {
  const rawFields = (await sendRequest(
    config,
    'GET',
    'get_result_fields',
    {},
  )) as ResultField[];

  return rawFields.map((t) => {
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
        c.context.project_ids.includes(project.id)
      ) {
        isEnabledOnProject = true;
      }
    }

    // Search in the submission to find a match
    return {
      ...t,
      enabledOnProject: isEnabledOnProject, // Is that custom field valid for the current project
      type: staticTypes[t.type_id],
      value: customFieldsSubmission[t.system_name]?.toString() ?? '',
    };
  });
};

export const getTestrailCustomFields = async ({
  config,
  log,
  project,
  testrailCustomResultFields,
}: {
  config: TestRailConfig;
  log: (msg: string) => void;
  project: Project;
  testrailCustomResultFields: string;
}): Promise<ResultField[]> => {
  if (
    testrailCustomResultFields === undefined ||
    testrailCustomResultFields === ''
  ) {
    return [];
  }

  // Parse the provided json file
  if (!existsSync(testrailCustomResultFields)) {
    throw new Error(
      `Something went wrong. The provided path: ${testrailCustomResultFields} does not exist.`,
    );
  }

  if (!lstatSync(testrailCustomResultFields).isFile()) {
    throw new Error(
      `Something went wrong. The provided path: ${testrailCustomResultFields} is not a file`,
    );
  }

  log(`Parsing the content of file: ${testrailCustomResultFields}`);

  const rawFile = readFileSync(testrailCustomResultFields, 'utf8');
  const customFieldsSubmission = JSON.parse(rawFile.toString());

  // Get all configured Testrail custom fields for that account
  // Decorate it with value and project details
  ux.action.start(`Fetching custom fields from Testrail`);
  const testrailCustomFields = await getTestrailResultFields(
    config,
    project,
    customFieldsSubmission,
  );
  ux.action.stop(`${testrailCustomFields.length} fields fetched`);

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

  // Display custom fields in JSON format for review
  const testrailEnabledCustomFields = testrailCustomFields.filter(
    (f) => f.enabledOnProject === true,
  );

  log(
    'The following custom fields are present on testrail and enabled on the project:',
  );
  for (const f of testrailEnabledCustomFields) {
    log(
      `Custom field: '${f.label}' - system_name: '${f.system_name}' - value: '${f.value}'`,
    );
  }

  return testrailEnabledCustomFields;
};

export const getTestrailCaseFields = async (
  config: TestRailConfig,
): Promise<CaseFields[]> =>
  (await sendRequest(config, 'GET', 'get_case_fields', {})) as Promise<
    CaseFields[]
  >;

export const getTestrailCustomStatus = async (
  testrailCaseFields: CaseFields[],
  status: string,
): Promise<number> => {
  const statusField = testrailCaseFields.find(
    (field) => field.system_name === 'custom_status',
  );
  if (statusField === undefined) {
    throw new Error(
      "Something went wrong. Can't find custom field 'custom_status'",
    );
  }

  // the returned items look like this:
  // "1, Incomplete/draft\n2, Complete\n3, In progress\n4, Needs to be checked/reworked
  const listOfCustomStatus = statusField.configs[0].options.items.split('\n');
  const foundStatus = listOfCustomStatus.find((s) => s.includes(status));
  if (foundStatus === undefined) {
    throw new Error(`Something went wrong. Can't find custom status ${status}`);
  }

  return Number(foundStatus.split(',')[0]);
};

export const getTestrailCustomVersion = async (
  testrailCaseFields: CaseFields[],
  version: string,
): Promise<number[]> => {
  const versionField = testrailCaseFields.find(
    (field) => field.system_name === 'custom_version',
  );
  if (versionField === undefined) {
    throw new Error(
      "Something went wrong. Can't find custom field 'custom_version'",
    );
  }

  // the returned items look like this:
  // 1, 7.2.0.0\n 2, 7.1.2.2\n....
  const listOfCustomVersion = versionField.configs[0].options.items.split('\n');
  const foundVersion = listOfCustomVersion.find((v) => v.includes(version));
  if (foundVersion === undefined) {
    throw new Error(
      `Something went wrong. Can't find custom version ${version}`,
    );
  }

  return [Number(foundVersion.split(',')[0])];
};
