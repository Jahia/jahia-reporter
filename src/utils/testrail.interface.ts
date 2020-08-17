export enum Status {
  Passed = 1,
  Blocked = 2,
  Untested = 3,
  Retest = 4,
  Failed = 5,
}

export interface TestRailResult {
  case_id: number;
  status_id: Status;
  comment?: string;
  elapsed?: string;
  version?: string;
}

export interface Project {
  id: number;
  name: string;
  show_announcement: false;
  is_completed: boolean;
  suite_mode: number;
  url: string;
}

export interface Suite {
  id: number;
  name: string;
}

export interface Section {
  id: number;
  name: string;
  parent_id: number;
}

export interface Test {
  section: string;
  title: string;
  time: string;
  comment?: string;
  id?: number;
  steps?: string;
  section_id?: string;
}

export interface AddCase {
  title: string;
  custom_status: number;
  custom_version: number[];
  custom_steps_separated?: any[];
}

export interface Run {
  id: number;
}

export interface AddRun {
  suite_id: number;
  name: string;
  description: string;
  include_all?: boolean;
  case_ids?: (number | undefined)[];
}

export interface CaseFields {
  id: number;
  system_name: string;
  configs: Config[];
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
  is_required: boolean;
  default_value: string;
  items: string;
}
