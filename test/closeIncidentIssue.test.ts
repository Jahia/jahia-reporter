import { closeIncidentIssue } from '../src/utils/github/closeIncidentIssue.js';
import type { GitHubIssue, Incident } from '../src/types/index.js';

// Mock Octokit
const mockGraphql = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    graphql: mockGraphql,
  })),
}));

describe('closeIncidentIssue', () => {
  const mockLog = jest.fn();

  const createMockIncident = (overrides: Partial<Incident> = {}): Incident => ({
    assignee: 'john-doe',
    counts: { fail: 0, skip: 0, success: 10, total: 10 },
    dedupKey: 'dedup-123',
    description: 'All tests passed successfully',
    service: 'ci-service',
    sourceUrl: 'https://ci.example.com/build/124',
    title: 'CI Success',
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

  it('should close issue and add comment', async () => {
    const incidentContent = createMockIncident();
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({
      addComment: { clientMutationId: 'mutation-1' },
      closeIssue: { clientMutationId: 'mutation-2' },
    });

    await closeIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('mutation'),
      expect.objectContaining({
        issueId: 'issue-node-id',
        reason: 'COMPLETED',
        comment: expect.stringContaining(
          '✅ A CI/CD workflow has completed successfully',
        ),
      }),
    );
    expect(mockLog).toHaveBeenCalledWith(
      'Issue #42 will be closed (https://github.com/org/repo/issues/42',
    );
  });

  it('should include description in comment', async () => {
    const incidentContent = createMockIncident({
      description: 'Custom description',
    });
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await closeIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        comment: expect.stringContaining('Custom description'),
      }),
    );
  });

  it('should include source URL in comment', async () => {
    const incidentContent = createMockIncident({
      sourceUrl: 'https://custom.url/build',
    });
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await closeIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        comment: expect.stringContaining(
          '**Source URL:** https://custom.url/build',
        ),
      }),
    );
  });

  it('should use COMPLETED as close reason', async () => {
    const incidentContent = createMockIncident();
    const issue = createMockIssue();

    mockGraphql.mockResolvedValue({});

    await closeIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reason: 'COMPLETED',
      }),
    );
  });
});
