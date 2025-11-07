import { AddRun, Run } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import { TestRailConfig } from './config.js';

// Run-related functions
export const addRun = (
  config: TestRailConfig,
  projectId: number,
  addRun: AddRun,
): Run =>
  sendRequest(config, 'POST', 'add_run/' + projectId.toString(), addRun) as Run;

export const closeRun = (config: TestRailConfig, runId: number): Run =>
  sendRequest(
    config,
    'POST',
    'close_run/' + runId.toString(),
    '/runs/close/' + runId.toString(),
  ) as Run;

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
