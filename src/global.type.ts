export interface Incident {
  assignee?: string;
  counts: {
    fail: number;
    skip: number;
    success: number;
    total: number;
  };
  dedupKey: string;
  description: string;
  service: string;
  sourceUrl: string;
  title: string;
}

export interface GitHubProject {
  id: string;
  number: number;
}

export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  url: string;
}

export interface JRTestfailure {
  text: string;
}

interface JRTestcase {
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

// A run is composed of multiple junit files
export interface JRCase {
  caseFailure: number;
  caseSuccess: number;
  caseTotal: number;
  createdAt: string;
  duration: number;
  id: string;
  jahia: string;
  module: string;
  name: string;
  state: string;
  suite: string;
}

export interface ZenCrepesDependency {
  full: string;
  id: string;
  name: string;
  url?: string;
  version: string;
}

export interface ZenCrepesStateNode {
  cases: JRCase[];
  createdAt: string;
  dependencies: ZenCrepesDependency[];
  full?: string;
  id: string;
  name: string;
  runDuration: number;
  runFailure: number;
  runSuccess: number;
  runTotal: number;
  state: string;
  url: string;
  version: string;
}

export interface JahiaModule {
  id: string;
  name: string;
  version: string;
}

export interface UtilsVersions {
  allModules: JahiaModule[];
  dependencies: JahiaModule[];
  jahia: {
    build: string;
    fullVersion: string;
    version: string;
  };
  module: JahiaModule;
}

export interface UtilsPlatform {
  cluster: {
    isActivated: boolean;
  };
  jahia: {
    database: {
      driverName: string;
      driverVersion: string;
      name: string;
      type: string;
      url: string;
      version: string;
    };
    system: {
      java: {
        runtimeName: string;
        runtimeVerison: string;
        vendor: string;
        vendorVersion: string;
      };
      os: {
        architecture: string;
        name: string;
        version: string;
      };
    };
    version: {
      build: string;
      buildDate: string;
      isSnapshot: string;
      release: string;
    };
  };
}

export interface JMeterTRunTransaction {
  errorCount?: number;
  errorPct?: number;
  maxResTime?: number;
  meanResTime?: number;
  medianResTime?: number;
  minResTime?: number;
  name: string;
  pct1ResTime?: number;
  pct2ResTime?: number;
  pct3ResTime?: number;
  receivedKBytesPerSec?: number;
  sampleCount?: number;
  sentKBytesPerSec?: number;
  throughput?: number;
}

export interface JMeterTRun {
  name: string;
  transactions: JMeterTRunTransaction[];
}

export interface JMeterTMetricConstraint {
  comparator: 'gt' | 'gte' | 'lt' | 'lte';
  metric: string;
}

export interface JMeterThresholds {
  runs: JMeterTRun[];
  specs: JMeterTMetricConstraint[];
}

export interface JMeterRunTransaction {
  errorCount: number;
  errorPct: number;
  maxResTime: number;
  meanResTime: number;
  medianResTime: number;
  minResTime: number;
  pct1ResTime: number;
  pct2ResTime: number;
  pct3ResTime: number;
  receivedKBytesPerSec: number;
  sampleCount: number;
  sentKBytesPerSec: number;
  throughput: number;
  transaction: string;
}

// export interface JMeterRunStatistics {
//   // [key: string]: JMeterRunTransaction;
//   Record<string, JMeterRunTransaction>
// }

export interface JMeterRun {
  duration: number;
  name: string;
  statistics: Record<string, JMeterRunTransaction>;
}

export interface JMeterExec {
  duration: number;
  runs: JMeterRun[];
  startedAt: string;
  tags: Array<{ name: string }>;
}

export interface JMeterExecAnalysisReport {
  comparator: string;
  error: boolean;
  metric: string;
  run: string;
  runValue: number | string;
  thresholdValue: number | string | undefined;
  transaction: string;
}
