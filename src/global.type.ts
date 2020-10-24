interface TestFailure {
  text: string;
}

interface TestCase {
  name: string;
  time: number;
  status: string;
  failures: TestFailure[];
}

export interface TestSuite {
  name: string;
  errors?: number;
  failures: number;
  skipped?: number;
  timestamp: string;
  time: number;
  tests: TestCase[];
}

// A report is a junit test file composed of multiple suites
export interface JunitReport {
  name: string;
  tests: number;
  failures: number;
  time: number;
  testsuites: TestSuite[];
}

// A run is composed of multiple junit files
export interface JunitRun {
  tests: number;
  failures: number;
  time: number;
  reports: JunitReport[];
}
