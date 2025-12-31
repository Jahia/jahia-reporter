import type { TestRailConfig } from '../testrail.interface.js';

import { TestRailResult } from '../testrail.interface.js';
import { sendRequest } from './client.js';

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
