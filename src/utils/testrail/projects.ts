import { ux } from '@oclif/core';

import { PaginatedProjects, Project } from '../testrail.interface.js';
import { sendRequest } from './client.js';
import type { TestRailConfig } from '../testrail.interface.js';

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

export const getTestrailProject = async (
  config: TestRailConfig,
  projectName: string,
  log: (msg: string) => void,
): Promise<Project> => {
  ux.action.start(`Searching project: ${projectName} in Testrail`);

  const testrailProjects = await getTestrailProjects(config);

  log(
    `List of projects in Testrail: ${testrailProjects.map((p) => p.name).join(', ')}`,
  );

  const testrailProject = testrailProjects.find(
    (project) => project.name === projectName,
  );
  if (testrailProject === undefined) {
    throw new Error(`Failed to find project named '${projectName}'`);
  }

  ux.action.stop(
    `Project found: ${testrailProject.name} with URL: ${testrailProject.url}`,
  );

  return testrailProject as Project;
};
