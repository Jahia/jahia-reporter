// Returns the issues of a service an incident acts on: all of them, or with matchDedupKey only
// the ones whose body carries the incident's dedup key
export const getIssuesInScope = <T extends { body: string }>(
  issues: T[],
  dedupKey: string,
  matchDedupKey: boolean,
): T[] =>
  matchDedupKey ? issues.filter((i) => i.body.includes(dedupKey)) : issues;
