import { searchForIssues } from '../src/utils/github/searchForIssues.js';

// Mock Octokit
const mockGraphql = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    graphql: mockGraphql,
  })),
}));

describe('searchForIssues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should search for issues and return results', async () => {
    const mockIssues = [
      {
        id: 'issue-1',
        number: 1,
        title: 'Test Issue 1',
        body: 'Body 1',
        state: 'OPEN',
        url: 'https://github.com/org/repo/issues/1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        closedAt: null,
        author: { login: 'user1' },
      },
    ];

    mockGraphql.mockResolvedValue({
      search: {
        edges: mockIssues.map((node) => ({ node })),
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    });

    const result = await searchForIssues('token', 'org/repo', 'label:bug');

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('query($searchQuery: String!'),
      expect.objectContaining({
        searchQuery: 'repo:org/repo label:bug',
        cursor: undefined,
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Issue 1');
  });

  it('should paginate through multiple pages', async () => {
    const issue1 = { id: 'issue-1', number: 1, title: 'Issue 1' };
    const issue2 = { id: 'issue-2', number: 2, title: 'Issue 2' };

    mockGraphql
      .mockResolvedValueOnce({
        search: {
          edges: [{ node: issue1 }],
          pageInfo: {
            hasNextPage: true,
            endCursor: 'cursor1',
          },
        },
      })
      .mockResolvedValueOnce({
        search: {
          edges: [{ node: issue2 }],
          pageInfo: {
            hasNextPage: false,
            endCursor: null,
          },
        },
      });

    const result = await searchForIssues('token', 'org/repo', 'is:open');

    expect(mockGraphql).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Issue 1');
    expect(result[1].title).toBe('Issue 2');
  });

  it('should return empty array when no issues found', async () => {
    mockGraphql.mockResolvedValue({
      search: {
        edges: [],
        pageInfo: {
          hasNextPage: false,
          endCursor: null,
        },
      },
    });

    const result = await searchForIssues('token', 'org/repo', 'nonexistent');

    expect(result).toEqual([]);
  });
});
