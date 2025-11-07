import { Milestone, PaginatedMilestones } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import { TestRailConfig } from './config.js';

// Milestone-related functions
export const addMilestone = (
  config: TestRailConfig,
  projectId: number,
  name: string,
): Milestone =>
  sendRequest(config, 'POST', 'add_milestone/' + projectId.toString(), {
    name,
  }) as Milestone;

export const getMilestones = (
  config: TestRailConfig,
  projectId: number,
): Milestone[] => {
  const milestonesObject = sendRequest(
    config,
    'GET',
    'get_milestones/' + projectId.toString(),
    '',
  ) as PaginatedMilestones;

  if (milestonesObject.size > 0) {
    return milestonesObject.milestones as Milestone[];
  }

  return [];
  // throw new Error("Something went wrong. Can't find any milestone")
};

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
