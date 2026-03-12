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
