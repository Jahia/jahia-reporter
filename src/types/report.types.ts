export interface JRTestfailure {
  text: string;
}

export interface JRTestcase {
  failures: JRTestfailure[];
  name: string;
  status: string;
  steps?: string;
  time: number;
}

export interface JRTestsuite {
  errors?: number;
  failures: number;
  name: string;
  pending: number;
  skipped: number;
  tests: JRTestcase[];
  time: number;
  timestamp: string;
}

// A report is a junit test file composed of multiple suites
export interface JRReport {
  failures: number;
  name: string;
  pending: number;
  skipped: number;
  tests: number;
  testsuites: JRTestsuite[];
  time: number;
  timestamp?: string;
}

// A run is composed of multiple junit files
export interface JRRun {
  failures: number;
  pending: number;
  reports: JRReport[];
  skipped: number;
  tests: number;
  time: number;
}
