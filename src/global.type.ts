export interface JRTestfailure {
  text: string;
}

interface JRTestcase {
  name: string;
  time: number;
  status: string;
  failures: JRTestfailure[];
  steps?: string;
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
  skipped: number;
  time: number;
  testsuites: JRTestsuite[];
}

// A run is composed of multiple junit files
export interface JRRun {
  tests: number;
  failures: number;
  skipped: number;
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

export interface UtilsPlatform {
  jahia: {
    version: {
      build: string;
      buildDate: string;
      isSnapshot: string;
      release: string;
    };
    database: {
      type: string;
      name: string;
      version: string;
      driverName: string;
      driverVersion: string;
      url: string;
    };
    system: {
      os: {
        name: string;
        architecture: string;
        version: string;
      };
      java: {
        runtimeName: string;
        runtimeVerison: string;
        vendor: string;
        vendorVersion: string;
      };
    };
  };
  cluster: {
    isActivated: boolean;
  };
}

export interface JMeterTRunTransaction {
  name: string;
  sampleCount?: number;
  errorCount?: number;
  errorPct?: number;
  meanResTime?: number;
  medianResTime?: number;
  minResTime?: number;
  maxResTime?: number;
  pct1ResTime?: number;
  pct2ResTime?: number;
  pct3ResTime?: number;
  throughput?: number;
  receivedKBytesPerSec?: number;
  sentKBytesPerSec?: number;
}

export interface JMeterTRun {
  name: string;
  transactions: JMeterTRunTransaction[];
}

export interface JMeterTMetricConstraint {
  metric: string;
  comparator: 'gt' | 'gte' | 'lt' | 'lte';
}

export interface JMeterThresholds {
  runs: JMeterTRun[];
  specs: JMeterTMetricConstraint[];
}

export interface JMeterRunTransaction {
  transaction: string;
  sampleCount: number;
  errorCount: number;
  errorPct: number;
  meanResTime: number;
  medianResTime: number;
  minResTime: number;
  maxResTime: number;
  pct1ResTime: number;
  pct2ResTime: number;
  pct3ResTime: number;
  throughput: number;
  receivedKBytesPerSec: number;
  sentKBytesPerSec: number;
}

// export interface JMeterRunStatistics {
//   // [key: string]: JMeterRunTransaction;
//   Record<string, JMeterRunTransaction>
// }

export interface JMeterRun {
  name: string;
  duration: number;
  statistics: Record<string, JMeterRunTransaction>;
}

export interface JMeterExec {
  duration: number;
  runs: JMeterRun[];
  startedAt: string;
  tags: Array<any>;
}

export interface JMeterExecAnalysisReport {
  error: boolean;
  run: string;
  transaction: string;
  metric: string;
  comparator: string;
  runValue: number | string;
  thresholdValue: number | string | undefined;
}
