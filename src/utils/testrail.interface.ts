export enum Status {
  Blocked = 2,
  Failed = 5,
  Passed = 1,
  Retest = 4,
  Untested = 3,
}

export interface TestRailResult {
  [key: string]: any; // Allow custom fields
  case_id: number;
  comment?: string;
  elapsed?: string;
  status_id: Status;
  version?: string;
}

export interface PaginatedProjects {
  limit: number;
  offset: number;
  projects: Project[];
  size: number;
}

export interface Project {
  id: number;
  is_completed: boolean;
  name: string;
  show_announcement: false;
  suite_mode: number;
  url: string;
}

export interface ResultField {
  configs: ResultFieldConfig[];
  description: string;
  display_order: number;
  // Fields added while comparing with the submitted file
  enabledOnProject: boolean;
  id: number;
  include_all: number;
  is_active: boolean;
  label: string;
  name: string;
  system_name: string;
  template_ids: number[];

  type: string;
  type_id: number;
  value: string;
}

export interface ResultFieldConfig {
  context: {
    is_global: boolean;
    project_ids: number[];
  };
  id: number;
  options: {
    defailt_value: string;
    is_required: false;
  };
}

export interface PaginatedSuites {
  limit: number;
  offset: number;
  size: number;
  suites: Suite[];
}

export interface Suite {
  id: number;
  name: string;
}

export interface PaginatedMilestones {
  limit: number;
  milestones: Milestone[];
  offset: number;
  size: number;
}

export interface Milestone {
  id: number;
  name: string;
  project_id: number;
}

export interface PaginatedSections {
  _links: {
    next: string;
    prev: null | string;
  };
  limit: number;
  offset: number;
  sections: Section[];
  size: number;
}

export interface Section {
  id: number;
  name: string;
  parent_id: number;
}

export interface PaginatedTests {
  cases: Test[];
  limit: number;
  offset: number;
  size: number;
}

export interface Test {
  comment?: string;
  id?: number;
  section: string;
  section_id?: string;
  steps?: string;
  time: string;
  title: string;
}

export interface AddCase {
  custom_status: number;
  custom_steps_separated?: any[];
  custom_version: number[];
  title: string;
}

export interface Run {
  id: number;
}

export interface AddRun {
  case_ids?: (number | undefined)[];
  description: string;
  include_all?: boolean;
  milestone_id?: number;
  name: string;
  suite_id: number;
}

export interface CaseFields {
  configs: Config[];
  id: number;
  system_name: string;
}

export interface Config {
  context: Context;
  options: Options;
}

export interface Context {
  is_global: boolean;
  project_ids: number[];
}

export interface Options {
  default_value: string;
  is_required: boolean;
  items: string;
}
