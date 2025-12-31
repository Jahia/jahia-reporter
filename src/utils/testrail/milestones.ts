import type { TestRailConfig } from '../testrail.interface.js';

import { Milestone, PaginatedMilestones } from '../testrail.interface.js';
import { sendRequest } from './client.js';

export const getTestrailMilestones = async (
  config: TestRailConfig,
  projectId: number,
): Promise<Milestone[]> => {
  const milestonesObject = (await sendRequest(
    config,
    'GET',
    'get_milestones/' + projectId.toString(),
    '',
  )) as PaginatedMilestones;

  if (milestonesObject.size > 0) {
    return milestonesObject.milestones as Milestone[];
  }

  return [];
  // throw new Error("Something went wrong. Can't find any milestone")
};

export const addTestrailMilestone = async (
  config: TestRailConfig,
  projectId: number,
  name: string,
): Promise<Milestone> =>
  (await sendRequest(config, 'POST', 'add_milestone/' + projectId.toString(), {
    name,
  })) as Promise<Milestone>;
