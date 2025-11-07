import { PaginatedSuites, Suite } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import { TestRailConfig } from './config.js';

// Suite-related functions
export const getSuites = (
  config: TestRailConfig,
  projectId: number,
): Suite[] => {
  const getSuites = sendRequest(
    config,
    'GET',
    'get_suites/' + projectId.toString(),
    '',
  ) as PaginatedSuites;
  return getSuites.suites as Suite[];
};

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
