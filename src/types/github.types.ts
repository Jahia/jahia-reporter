export interface GitHubProject {
  id: string;
  number: number;
}

export interface GitHubIssue {
  id: string;
  node_id: string;
  number: number;
  title: string;
  url: string;
}
