import { reopenIncidentIssue } from '../src/utils/github/reopenIncidentIssue.js';
import type { GitHubIssue, Incident } from '../src/types/index.js';

// Mock Octokit
const mockGraphql = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    graphql: mockGraphql,
  })),
}));

describe('reopenIncidentIssue', () => {
  const mockLog = jest.fn();

  const createMockIncident = (overrides: Partial<Incident> = {}): Incident => ({
    assignee: 'john-doe',
    counts: { fail: 2, skip: 0, success: 8, total: 10 },
    dedupKey: 'dedup-123',
    description: 'Tests failed again',
    service: 'ci-service',
    sourceUrl: 'https://ci.example.com/build/125',
    title: 'CI Failure Redux',
    ...overrides,
  });

  const createMockIssue = (
    overrides: Partial<GitHubIssue> = {},
  ): GitHubIssue => ({
    id: 'issue-node-id',
    node_id: 'issue-node-id',
    number: 42,
    title: 'CI Failure',
    url: 'https://github.com/org/repo/issues/42',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reopen issue and add comment', async () => {
    const incidentContent = createMockIncident();
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({
      addComment: { clientMutationId: 'mutation-1' },
      reopenIssue: { clientMutationId: 'mutation-2' },
    });

    await reopenIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('mutation'),
      expect.objectContaining({
        issueId: 'issue-node-id',
        comment: expect.stringContaining(
          '❌ A CI/CD workflow run with the same dedup key has failed',
        ),
      }),
    );
    expect(mockLog).toHaveBeenCalledWith(
      'Issue #42 will be Re-opened (https://github.com/org/repo/issues/42)',
    );
  });

  it('should include description in comment', async () => {
    const incidentContent = createMockIncident({
      description: 'New failure details',
    });
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await reopenIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        comment: expect.stringContaining('New failure details'),
      }),
    );
  });

  it('should include source URL in comment', async () => {
    const incidentContent = createMockIncident({
      sourceUrl: 'https://new.url/build',
    });
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await reopenIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        comment: expect.stringContaining(
          '**Source URL:** https://new.url/build',
        ),
      }),
    );
  });

  it('should use reopenIssue mutation', async () => {
    const incidentContent = createMockIncident();
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await reopenIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('reopenIssue'),
      expect.any(Object),
    );
  });

  it('should return graphql response', async () => {
    const incidentContent = createMockIncident();
    const issue = createMockIssue();
    const expectedResponse = {
      addComment: { clientMutationId: 'test' },
      reopenIssue: { clientMutationId: 'test2' },
    };

    mockGraphql.mockResolvedValue(expectedResponse);

    const result = await reopenIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(result).toEqual(expectedResponse);
  });
});
