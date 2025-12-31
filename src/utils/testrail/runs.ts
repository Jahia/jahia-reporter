import type { TestRailConfig } from '../testrail.interface.js';

import { AddRun, Run } from '../testrail.interface.js';
import { sendRequest } from './client.js';

// Run-related functions
export const addTestrailRun = async (
  config: TestRailConfig,
  projectId: number,
  addRun: AddRun,
): Promise<Run> =>
  (await sendRequest(
    config,
    'POST',
    'add_run/' + projectId.toString(),
    addRun,
  )) as Run;

export const closeTestrailRun = async (
  config: TestRailConfig,
  runId: number,
): Promise<Run> =>
  (await sendRequest(
    config,
    'POST',
    'close_run/' + runId.toString(),
    '/runs/close/' + runId.toString(),
  )) as Run;
