import { ux } from '@oclif/core';

import {
  PaginatedSuites,
  Project,
  Suite,
  TestRailConfig,
} from '../testrail.interface.js';
import { sendRequest } from './client.js';

// Suite-related functions
export const getTestrailSuites = async (
  config: TestRailConfig,
  projectId: number,
): Promise<Suite[]> => {
  const getSuites = (await sendRequest(
    config,
    'GET',
    'get_suites/' + projectId.toString(),
    '',
  )) as PaginatedSuites;
  return getSuites.suites as Suite[];
};

export const getTestrailSuite = async (
  config: TestRailConfig,
  project: Project,
  suiteName: string,
  log: (msg: string) => void,
): Promise<Suite> => {
  ux.action.start(`Searching suite: ${suiteName} in Testrail`);

  const testrailSuites = await getTestrailSuites(config, project.id);

  log(
    `List of suites in Testrail: ${testrailSuites.map((p) => p.name).join(', ')}`,
  );

  const testrailSuite = testrailSuites.find(
    (suite) => suite.name === suiteName,
  );
  if (testrailSuite === undefined) {
    throw new Error(
      `Failed to find suite named: '${suiteName}' in project: '${project.name}'`,
    );
  }

  ux.action.stop(
    `Suite found: ${testrailSuite.name} with ID: ${testrailSuite.id}`,
  );

  return testrailSuite as Suite;
};
