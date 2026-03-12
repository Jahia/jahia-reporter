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
