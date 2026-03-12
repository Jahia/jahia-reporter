import { addIssueToProject } from '../src/utils/github/addIssueToProject.js';
import type { GitHubIssue } from '../src/types/index.js';
import { sleep } from '../src/utils/sleep.js';

// Mock Octokit
const mockGraphql = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    graphql: mockGraphql,
  })),
}));

// Mock sleep
jest.mock('../src/utils/sleep.js', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

describe('addIssueToProject', () => {
  const mockLog = jest.fn();

  const createMockIssue = (
    overrides: Partial<GitHubIssue> = {},
  ): GitHubIssue => ({
    id: 'issue-node-id',
    node_id: 'issue-node-id',
    number: 42,
    title: 'Test Issue',
    url: 'https://github.com/org/repo/issues/42',
    ...overrides,
  });

  const createMockProject = () => ({
    id: 'project-id',
    url: 'https://github.com/orgs/org/projects/1',
    status: {
      id: 'status-field-id',
      options: [
        { id: 'status-todo', name: 'Todo' },
        { id: 'status-done', name: 'Done' },
      ],
    },
    teams: {
      id: 'team-field-id',
      options: [
        { id: 'team-a', name: 'Team A' },
        { id: 'team-b', name: 'Team B' },
      ],
    },
    priorities: {
      id: 'priority-field-id',
      options: [
        { id: 'pri-high', name: 'High' },
        { id: 'pri-low', name: 'Low' },
      ],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGraphql.mockResolvedValue({
      addProjectV2ItemById: { item: { id: 'card-id-123' } },
      updateProjectV2ItemFieldValue: { projectV2Item: { id: 'card-id-123' } },
    });
  });

  it('should add issue to project', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('addProjectV2ItemById'),
      expect.objectContaining({
        contentId: 'issue-node-id',
        projectId: 'project-id',
      }),
    );
    expect(mockLog).toHaveBeenCalledWith(
      'Adding issue #42 to the project (https://github.com/orgs/org/projects/1)',
    );
  });

  it('should use node_id when available', async () => {
    const issue = createMockIssue({ id: 'old-id', node_id: 'new-node-id' });
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('addProjectV2ItemById'),
      expect.objectContaining({
        contentId: 'new-node-id',
      }),
    );
  });

  it('should fallback to id when node_id is undefined', async () => {
    const issue = createMockIssue({ node_id: undefined });
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('addProjectV2ItemById'),
      expect.objectContaining({
        contentId: 'issue-node-id',
      }),
    );
  });

  it('should sleep after adding to project', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(sleep).toHaveBeenCalledWith(5000);
    expect(mockLog).toHaveBeenCalledWith(
      'Sleeping for 5 seconds to allow GitHub to update project data...',
    );
  });

  it('should update status when found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      expect.objectContaining({
        projectId: 'project-id',
        projectCardId: 'card-id-123',
        projectFieldId: 'status-field-id',
        projectValueId: 'status-todo',
      }),
    );
  });

  it('should log when status not found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Unknown Status',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockLog).toHaveBeenCalledWith(
      'Could not find the desired status: Unknown Status in project https://github.com/orgs/org/projects/1',
    );
  });

  it('should update team when found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team B',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      expect.objectContaining({
        projectFieldId: 'team-field-id',
        projectValueId: 'team-b',
      }),
    );
  });

  it('should log when team not found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'High',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Unknown Team',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockLog).toHaveBeenCalledWith(
      'Could not find the desired team: Unknown Team in project https://github.com/orgs/org/projects/1',
    );
  });

  it('should update priority when found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'Low',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('updateProjectV2ItemFieldValue'),
      expect.objectContaining({
        projectFieldId: 'priority-field-id',
        projectValueId: 'pri-low',
      }),
    );
  });

  it('should log when priority not found', async () => {
    const issue = createMockIssue();
    const project = createMockProject();

    await addIssueToProject({
      githubProject: project,
      githubProjectPriority: 'Unknown Priority',
      githubProjectStatus: 'Todo',
      githubProjectTeam: 'Team A',
      githubToken: 'token',
      issue,
      log: mockLog,
    });

    expect(mockLog).toHaveBeenCalledWith(
      'Could not find the desired priority: Unknown Priority in project https://github.com/orgs/org/projects/1',
    );
  });
});
