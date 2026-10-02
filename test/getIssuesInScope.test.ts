import { getIssuesInScope } from '../src/utils/incidents/getIssuesInScope.js';

describe('getIssuesInScope', () => {
  const issues = [
    { body: '**Dedup Key:** key-a', number: 1, state: 'OPEN' },
    { body: '**Dedup Key:** key-b', number: 2, state: 'OPEN' },
    { body: '**Dedup Key:** key-a', number: 3, state: 'CLOSED' },
  ];

  it('returns every issue of the service by default', () => {
    expect(getIssuesInScope(issues, 'key-a', false)).toEqual(issues);
  });

  it('returns only the issues carrying the dedup key when matchDedupKey is set', () => {
    expect(
      getIssuesInScope(issues, 'key-a', true).map((i) => i.number),
    ).toEqual([1, 3]);
  });

  it('returns no issue when none carries the dedup key', () => {
    expect(getIssuesInScope(issues, 'key-c', true)).toEqual([]);
  });
});
