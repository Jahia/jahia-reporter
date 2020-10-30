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
  full: string;
  dependencies: Dependency[]
  createdAt: string;
  state: string;
  url: string;
  runTotal: number
  runSuccess: number
  runFailure: number
  runDuration: number
}
