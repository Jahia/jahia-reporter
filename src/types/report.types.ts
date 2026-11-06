export interface JRTestfailure {
  text: string;
}

// The error of a failed test, as its test framework reports it
export interface JRTesterror {
  message: string;
  stack: string;
}

export interface JRTestcase {
  error?: JRTesterror;
  failures: JRTestfailure[];
  meta?: string | undefined;
  name: string;
  status: string;
  steps?: string;
  time: number;
}

export interface JRTestsuite {
  errors?: number;
  failures: number;
  // The spec file of the suite, relative to the root of the test project
  file?: string;
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
