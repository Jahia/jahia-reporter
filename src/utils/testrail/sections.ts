import type {
  PaginatedSections,
  Project,
  Section,
  Suite,
  TestRailConfig,
} from '../testrail.interface.js';

import { sendRequest } from './client.js';

export const getTestrailSections = async (
  config: TestRailConfig,
  projectId: number,
  suiteId: number,
): Promise<Section[]> => {
  const sections: Section[] = [];
  const sectionsObject = (await sendRequest(
    config,
    'GET',
    `get_sections/${projectId.toString()}&suite_id=${suiteId.toString()}`,
    '',
  )) as PaginatedSections;

  if (sectionsObject.size > 0) {
    for (const s of sectionsObject.sections) {
      sections.push(s);
    }

    let lastCallSectionsCount = sectionsObject.sections.length;
    const hardLimit = 50; // Hard limit the number of queries to avoid going in an infinite loop
    let cpt = 0;

    while (lastCallSectionsCount > 0 && cpt <= hardLimit) {
      const sectionsObject = (await sendRequest(
        config,
        'GET',
        `get_sections/${projectId.toString()}&suite_id=${suiteId.toString()}&limit=250&offset=${
          sections.length
        }`,
        '',
      )) as PaginatedSections;
      lastCallSectionsCount = sectionsObject.sections.length;

      console.log(
        `Fetched ${lastCallSectionsCount} sections (${sections.length} already fetched)`,
      );

      for (const s of sectionsObject.sections) {
        sections.push(s);
      }

      cpt++;
    }

    return sections;
  }

  return [];
  // throw new Error("Something went wrong. Can't find any section")
};

export const addTestrailSection = async (
  config: TestRailConfig,
  projectId: number,
  options: {
    parentId?: string;
    section: string;
    suiteId: number;
  },
): Promise<Section> => {
  const { parentId = '', section, suiteId } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sectionParams: any = {
    name: section,
    suite_id: suiteId.toString(),
  };

  if (parentId !== '') {
    sectionParams = {
      ...sectionParams,
      parent_id: parentId,
    };
  }

  return (await sendRequest(
    config,
    'POST',
    'add_section/' + projectId.toString(),
    sectionParams,
  )) as Section;
};

export const getTestrailParentSection = async (
  config: TestRailConfig,
  parentSectionName: string,
  project: Project,
  suite: Suite,
  testrailSections: Section[],
  log: (msg: string) => void,
): Promise<Section | null> => {
  if (parentSectionName === '') {
    return null;
  }

  const foundSection = testrailSections.find(
    (section) => section.name === parentSectionName,
  );
  if (foundSection !== undefined) {
    log(
      `Found existing section '${foundSection.name}' with ID: ${foundSection.id}`,
    );
    return foundSection;
  }

  log(
    `Failed to find section named '${parentSectionName}' in project '${project.name}'. Creating the section now.`,
  );
  const newSection = await addTestrailSection(config, project.id, {
    parentId: '',
    section: parentSectionName,
    suiteId: suite.id,
  });
  log(`Created section '${newSection.name}' with ID: ${newSection.id}`);

  return newSection;
};
