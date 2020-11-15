interface JRTestfailure {
  text: string;
}

interface JRTestcase {
  name: string;
  time: number;
  status: string;
  failures: JRTestfailure[];
}

export interface JRTestsuite {
  name: string;
  errors?: number;
  failures: number;
  skipped?: number;
  timestamp: string;
  time: number;
  tests: JRTestcase[];
}

// A report is a junit test file composed of multiple suites
export interface JRReport {
  name: string;
  tests: number;
  failures: number;
  time: number;
  testsuites: JRTestsuite[];
}

// A run is composed of multiple junit files
export interface JRRun {
  tests: number;
  failures: number;
  time: number;
  reports: JRReport[];
}

export interface ZenCrepesDependency {
  id: string;
  name: string;
  version: string;
  full: string;
  url?: string;
}

export interface ZenCrepesStateNode {
  id: string;
  name: string;
  version: string;
  full?: string;
  dependencies: ZenCrepesDependency[];
  createdAt: string;
  state: string;
  url: string;
  runTotal: number;
  runSuccess: number;
  runFailure: number;
  runDuration: number;
}

export interface JahiaModule {
    id: string;
    name: string;
    version: string;
}

export interface UtilsVersions {
  jahia: {
    version: string;
    build: string;
    fullVersion: string;
  };
  module: JahiaModule;
  dependencies: JahiaModule[];
  allModules: JahiaModule[];
}
