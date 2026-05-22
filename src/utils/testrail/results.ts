import { TestRailConfig, TestRailResult, UpdateCase } from '../../types/index.js';
import { sendRequest } from './client.js';

export const addTestrailResults = async (
  config: TestRailConfig,
  runId: number,
  results: TestRailResult[],
): Promise<TestRailResult[]> =>
  (await sendRequest(
    config,
    'POST',
    `add_results_for_cases/${runId}`,
    {results}
  )) as TestRailResult[];

/**
 * Updates TestRail test-case
 * @param {TestRailConfig} config TestRail config
 * @param {number} caseId test-case ID
 * @param {UpdateCase} body object with new test-case's attributes to be updated
 */
export const updateTestCase = async (
  config: TestRailConfig,
  caseId: number,
  body: UpdateCase,
): Promise<TestRailResult[]> =>
  (await sendRequest(
    config,
    'POST',
    `update_case/${caseId}`,
    body
  )) as TestRailResult[];
