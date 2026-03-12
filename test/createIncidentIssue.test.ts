import { createIncidentIssue } from '../src/utils/github/createIncidentIssue.js';
import type { Incident } from '../src/types/index.js';

// Mock Octokit
const mockRequest = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    request: mockRequest,
  })),
}));

describe('createIncidentIssue', () => {
  const mockLog = jest.fn();

  const createMockIncident = (overrides: Partial<Incident> = {}): Incident => ({
    assignee: 'john-doe',
    counts: { fail: 1, skip: 0, success: 9, total: 10 },
    dedupKey: 'dedup-123',
    description: 'Test failed with error',
    service: 'ci-service',
    sourceUrl: 'https://ci.example.com/build/123',
    title: 'CI Failure: Test Suite',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an issue with full incident details', async () => {
    const incidentContent = createMockIncident();

    mockRequest.mockResolvedValue({
      data: {
        html_url: 'https://github.com/org/repo/issues/42',
        number: 42,
      },
    });

    const result = await createIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issueLabel: 'ci-failure',
      log: mockLog,
      repository: 'org/repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      expect.objectContaining({
        owner: 'org',
        repo: 'repo',
        title: 'CI Failure: Test Suite',
        labels: ['ci-failure'],
        assignees: ['john-doe'],
        body: expect.stringContaining('Failure Details'),
      }),
    );
    expect(result.number).toBe(42);
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('Created issue'),
    );
  });

  it('should create issue body without description when empty', async () => {
    const incidentContent = createMockIncident({ description: '' });

    mockRequest.mockResolvedValue({
      data: { html_url: 'https://github.com/org/repo/issues/1', number: 1 },
    });

    await createIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issueLabel: 'label',
      log: mockLog,
      repository: 'org/repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      expect.objectContaining({
        body: expect.stringContaining('No test output is available'),
      }),
    );
  });

  it('should include service in issue body', async () => {
    const incidentContent = createMockIncident({ service: 'my-service' });

    mockRequest.mockResolvedValue({
      data: { html_url: 'url', number: 1 },
    });

    await createIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issueLabel: 'label',
      log: mockLog,
      repository: 'org/repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      expect.objectContaining({
        body: expect.stringContaining('**Service:** my-service'),
      }),
    );
  });

  it('should include dedup key in issue body', async () => {
    const incidentContent = createMockIncident({
      dedupKey: 'unique-dedup-key',
    });

    mockRequest.mockResolvedValue({
      data: { html_url: 'url', number: 1 },
    });

    await createIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issueLabel: 'label',
      log: mockLog,
      repository: 'org/repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      expect.objectContaining({
        body: expect.stringContaining('**Dedup Key:** unique-dedup-key'),
      }),
    );
  });

  it('should log the payload before creating issue', async () => {
    const incidentContent = createMockIncident();

    mockRequest.mockResolvedValue({
      data: { html_url: 'url', number: 1 },
    });

    await createIncidentIssue({
      githubToken: 'token',
      incidentContent,
      issueLabel: 'label',
      log: mockLog,
      repository: 'org/repo',
    });

    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('Creating issue:'),
    );
  });
});
