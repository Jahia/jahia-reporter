import {
  AddCase,
  PaginatedTests,
  Test,
  TestRailConfig,
} from '../../types/index.js';
import { sendRequest } from './client.js';

export const getTestrailCases = async (
  config: TestRailConfig,
  projectId: number,
  suiteId: number,
  sectionId: number,
): Promise<Test[]> => {
  const casesObject = (await sendRequest(
    config,
    'GET',
    'get_cases/' +
      projectId.toString() +
      '&suite_id=' +
      suiteId.toString() +
      '&section_id=' +
      sectionId.toString(),
    '',
  )) as PaginatedTests;

  if (casesObject.size > 0) {
    return casesObject.cases as Test[];
  }

  return [];
  // throw new Error("Something went wrong. Can't find any test case")
};

export const addTestrailCase = async (
  config: TestRailConfig,
  sectionId: number,
  addCase: AddCase,
): Promise<Test> =>
  (await sendRequest(
    config,
    'POST',
    'add_case/' + sectionId.toString(),
    addCase,
  )) as Test;
