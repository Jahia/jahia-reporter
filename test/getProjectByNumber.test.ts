import { getProjectByNumber } from '../src/utils/github/getProjectByNumber.js';

// Mock Octokit
const mockGraphql = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    graphql: mockGraphql,
  })),
}));

describe('getProjectByNumber', () => {
  const mockLog = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch project data by number', async () => {
    const mockProject = {
      id: 'project-id-123',
      title: 'Test Project',
      url: 'https://github.com/orgs/test-org/projects/1',
      status: {
        id: 'status-field-id',
        name: 'Status',
        options: [
          { id: 'opt-1', name: 'Todo' },
          { id: 'opt-2', name: 'In Progress' },
          { id: 'opt-3', name: 'Done' },
        ],
      },
      teams: {
        id: 'team-field-id',
        name: 'Team',
        options: [
          { id: 'team-1', name: 'Frontend' },
          { id: 'team-2', name: 'Backend' },
        ],
      },
      priorities: {
        id: 'priority-field-id',
        name: 'Priority',
        options: [
          { id: 'pri-1', name: 'High' },
          { id: 'pri-2', name: 'Medium' },
          { id: 'pri-3', name: 'Low' },
        ],
      },
    };

    mockGraphql.mockResolvedValue({
      organization: {
        projectV2: mockProject,
      },
    });

    const result = await getProjectByNumber({
      githubToken: 'token',
      log: mockLog,
      projectNumber: 1,
      projectOrg: 'test-org',
    });

    expect(mockGraphql).toHaveBeenCalledWith(
      expect.stringContaining('query ($projectNumber: Int!'),
      expect.objectContaining({
        projectNumber: 1,
        projectOrg: 'test-org',
      }),
    );
    expect(result).toEqual(mockProject);
  });

  it('should log fetch start and completion', async () => {
    mockGraphql.mockResolvedValue({
      organization: {
        projectV2: { id: 'proj-1', title: 'Project' },
      },
    });

    await getProjectByNumber({
      githubToken: 'token',
      log: mockLog,
      projectNumber: 5,
      projectOrg: 'my-org',
    });

    expect(mockLog).toHaveBeenCalledWith(
      'Fetching project data for project number: 5 in org: my-org',
    );
    expect(mockLog).toHaveBeenCalledWith(
      expect.stringContaining('Project data fetched successfully'),
    );
  });

  it('should request Status, Team, and Priority fields', async () => {
    mockGraphql.mockResolvedValue({
      organization: {
        projectV2: { id: 'proj-1' },
      },
    });

    await getProjectByNumber({
      githubToken: 'token',
      log: mockLog,
      projectNumber: 1,
      projectOrg: 'org',
    });

    const query = mockGraphql.mock.calls[0][0];
    expect(query).toContain('status: field(name: "Status")');
    expect(query).toContain('teams: field(name: "Team")');
    expect(query).toContain('priorities: field(name: "Priority")');
  });

  it('should handle project without optional fields', async () => {
    mockGraphql.mockResolvedValue({
      organization: {
        projectV2: {
          id: 'proj-1',
          title: 'Simple Project',
          url: 'https://github.com/orgs/org/projects/1',
          status: null,
          teams: null,
          priorities: null,
        },
      },
    });

    const result = await getProjectByNumber({
      githubToken: 'token',
      log: mockLog,
      projectNumber: 1,
      projectOrg: 'org',
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).status).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).teams).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).priorities).toBeNull();
  });
});
