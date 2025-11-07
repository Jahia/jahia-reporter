import { PaginatedProjects, Project } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import { TestRailConfig } from './config.js';

// Project-related functions
export const getProjects = (config: TestRailConfig): Project[] => {
  const projectsObject = sendRequest(
    config,
    'GET',
    'get_projects',
    '',
  ) as PaginatedProjects;

  if (projectsObject.size > 0) {
    return projectsObject.projects as Project[];
  }

  throw new Error("Something went wrong. Can't find any project");
};

export const getTestrailProjects = async (
  config: TestRailConfig,
): Promise<Project[]> => {
  const projectsObject = (await sendRequest(
    config,
    'GET',
    'get_projects',
    '',
  )) as PaginatedProjects;

  if (projectsObject.size > 0) {
    return projectsObject.projects as Project[];
  }

  throw new Error("Something went wrong. Can't find any project");
};
