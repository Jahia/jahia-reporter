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
