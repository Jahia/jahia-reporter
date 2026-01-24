import { getAssigneeFromCustomProperties } from '../src/utils/github/getAssigneeFromCustomProperties.js';

// Mock Octokit
const mockRequest = jest.fn();
jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(() => ({
    request: mockRequest,
  })),
}));

describe('getAssigneeFromCustomProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return assignee from Champion property', async () => {
    mockRequest.mockResolvedValue({
      data: [
        { property_name: 'Champion', value: 'john-doe' },
        { property_name: 'Team', value: 'platform' },
      ],
    });

    const result = await getAssigneeFromCustomProperties({
      githubToken: 'token',
      repository: 'org/repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/properties/values',
      expect.objectContaining({
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
        owner: 'org',
        repo: 'repo',
      }),
    );
    expect(result).toBe('john-doe');
  });

  it('should return assignee from custom property name', async () => {
    mockRequest.mockResolvedValue({
      data: [{ property_name: 'CustomAssignee', value: 'jane-doe' }],
    });

    const result = await getAssigneeFromCustomProperties({
      githubToken: 'token',
      propertyName: 'CustomAssignee',
      repository: 'org/repo',
    });

    expect(result).toBe('jane-doe');
  });

  it('should return empty string when property not found', async () => {
    mockRequest.mockResolvedValue({
      data: [{ property_name: 'OtherProperty', value: 'some-value' }],
    });

    const result = await getAssigneeFromCustomProperties({
      githubToken: 'token',
      repository: 'org/repo',
    });

    expect(result).toBe('');
  });

  it('should return empty string when property value is not a string', async () => {
    mockRequest.mockResolvedValue({
      data: [{ property_name: 'Champion', value: ['array', 'value'] }],
    });

    const result = await getAssigneeFromCustomProperties({
      githubToken: 'token',
      repository: 'org/repo',
    });

    expect(result).toBe('');
  });

  it('should return empty string when no properties', async () => {
    mockRequest.mockResolvedValue({
      data: [],
    });

    const result = await getAssigneeFromCustomProperties({
      githubToken: 'token',
      repository: 'org/repo',
    });

    expect(result).toBe('');
  });

  it('should handle repository with multiple segments', async () => {
    mockRequest.mockResolvedValue({
      data: [{ property_name: 'Champion', value: 'user' }],
    });

    await getAssigneeFromCustomProperties({
      githubToken: 'token',
      repository: 'my-org/my-repo',
    });

    expect(mockRequest).toHaveBeenCalledWith(
      'GET /repos/{owner}/{repo}/properties/values',
      expect.objectContaining({
        owner: 'my-org',
        repo: 'my-repo',
      }),
    );
  });
});
