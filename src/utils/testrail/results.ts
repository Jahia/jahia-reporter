import { TestRailResult } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import { TestRailConfig } from './config.js';

// Result-related functions
export const addResults = (
  config: TestRailConfig,
  runId: number,
  results: TestRailResult[],
): TestRailResult[] =>
  sendRequest(config, 'POST', 'add_results_for_cases/' + runId.toString(), {
    results,
  }) as TestRailResult[];

export const addTestrailResults = async (
  config: TestRailConfig,
  runId: number,
  results: TestRailResult[],
): Promise<TestRailResult[]> =>
  (await sendRequest(
    config,
    'POST',
    'add_results_for_cases/' + runId.toString(),
    {
      results,
    },
  )) as TestRailResult[];
