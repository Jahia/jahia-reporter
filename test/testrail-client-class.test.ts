import { TestRailClient } from '../src/utils/testrail/index.js';

// Mock all the functional modules
jest.mock('../src/utils/testrail/projects.js', () => ({
  getProjects: jest.fn(),
}));

jest.mock('../src/utils/testrail/milestones.js', () => ({
  addMilestone: jest.fn(),
  getMilestones: jest.fn(),
}));

jest.mock('../src/utils/testrail/suites.js', () => ({
  getSuites: jest.fn(),
}));

jest.mock('../src/utils/testrail/sections.js', () => ({
  addSection: jest.fn(),
  getSections: jest.fn(),
}));

jest.mock('../src/utils/testrail/cases.js', () => ({
  addCase: jest.fn(),
  getCases: jest.fn(),
}));

jest.mock('../src/utils/testrail/runs.js', () => ({
  addRun: jest.fn(),
  closeRun: jest.fn(),
}));

jest.mock('../src/utils/testrail/results.js', () => ({
  addResults: jest.fn(),
}));

jest.mock('../src/utils/testrail/fields.js', () => ({
  getCaseFields: jest.fn(),
  getCustomStatus: jest.fn(),
  getCustomVersion: jest.fn(),
  getResultFields: jest.fn(),
}));

// Import mocked functions
const { getProjects } = jest.mocked(
  require('../src/utils/testrail/projects.js'),
);
const { addMilestone, getMilestones } = jest.mocked(
  require('../src/utils/testrail/milestones.js'),
);
const { getSuites } = jest.mocked(require('../src/utils/testrail/suites.js'));
const { addSection, getSections } = jest.mocked(
  require('../src/utils/testrail/sections.js'),
);
const { addCase, getCases } = jest.mocked(
  require('../src/utils/testrail/cases.js'),
);
const { addRun, closeRun } = jest.mocked(
  require('../src/utils/testrail/runs.js'),
);
const { addResults } = jest.mocked(require('../src/utils/testrail/results.js'));
const { getCaseFields, getCustomStatus, getCustomVersion, getResultFields } =
  jest.mocked(require('../src/utils/testrail/fields.js'));

describe('TestRailClient', () => {
  let client: TestRailClient;

  beforeEach(() => {
    client = new TestRailClient(
      'https://test.testrail.io',
      'user@test.com',
      'password123',
      true,
    );
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with all parameters', () => {
      expect(client).toBeInstanceOf(TestRailClient);
    });

    it('should create client with default rate limiting', () => {
      const defaultClient = new TestRailClient(
        'https://test.testrail.io',
        'user@test.com',
        'password123',
      );
      expect(defaultClient).toBeInstanceOf(TestRailClient);
    });
  });

  describe('project methods', () => {
    it('should call getProjects', () => {
      const mockProjects = [{ id: 1, name: 'Test Project' }] as any;
      getProjects.mockReturnValue(mockProjects);

      const result = client.getProjects();

      expect(getProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          base: 'https://test.testrail.io/',
          enableRateLimiting: true,
          password: 'password123',
          username: 'user@test.com',
        }),
      );
      expect(result).toEqual(mockProjects);
    });
  });

  describe('milestone methods', () => {
    it('should call addMilestone', () => {
      const mockMilestone = { id: 1, name: 'Test Milestone' } as any;
      addMilestone.mockReturnValue(mockMilestone);

      const result = client.addMilestone(1, 'Test Milestone');

      expect(addMilestone).toHaveBeenCalledWith(
        expect.any(Object),
        1,
        'Test Milestone',
      );
      expect(result).toEqual(mockMilestone);
    });

    it('should call getMilestones', () => {
      const mockMilestones = [{ id: 1, name: 'Test Milestone' }] as any;
      getMilestones.mockReturnValue(mockMilestones);

      const result = client.getMilestones(1);

      expect(getMilestones).toHaveBeenCalledWith(expect.any(Object), 1);
      expect(result).toEqual(mockMilestones);
    });
  });

  describe('suite methods', () => {
    it('should call getSuites', () => {
      const mockSuites = [{ id: 1, name: 'Test Suite' }] as any;
      getSuites.mockReturnValue(mockSuites);

      const result = client.getSuites(1);

      expect(getSuites).toHaveBeenCalledWith(expect.any(Object), 1);
      expect(result).toEqual(mockSuites);
    });
  });

  describe('section methods', () => {
    it('should call addSection with all parameters', () => {
      const mockSection = { id: 1, name: 'Test Section' } as any;
      addSection.mockReturnValue(mockSection);

      const result = client.addSection(1, 2, 'Test Section', '3');

      expect(addSection).toHaveBeenCalledWith(expect.any(Object), 1, {
        parentId: '3',
        section: 'Test Section',
        suiteId: 2,
      });
      expect(result).toEqual(mockSection);
    });

    it('should call addSection with default parentId', () => {
      const mockSection = { id: 1, name: 'Test Section' } as any;
      addSection.mockReturnValue(mockSection);

      const result = client.addSection(1, 2, 'Test Section');

      expect(addSection).toHaveBeenCalledWith(expect.any(Object), 1, {
        parentId: '',
        section: 'Test Section',
        suiteId: 2,
      });
      expect(result).toEqual(mockSection);
    });

    it('should call getSections', () => {
      const mockSections = [{ id: 1, name: 'Test Section' }] as any;
      getSections.mockReturnValue(mockSections);

      const result = client.getSections(1, 2);

      expect(getSections).toHaveBeenCalledWith(expect.any(Object), 1, 2);
      expect(result).toEqual(mockSections);
    });
  });

  describe('case methods', () => {
    it('should call addCase', () => {
      const mockCase = { id: 1, title: 'Test Case' } as any;
      const testCase = {
        custom_status: 1,
        custom_version: [1],
        title: 'Test Case',
      } as any;
      addCase.mockReturnValue(mockCase);

      const result = client.addCase(1, testCase);

      expect(addCase).toHaveBeenCalledWith(expect.any(Object), 1, testCase);
      expect(result).toEqual(mockCase);
    });

    it('should call getCases', () => {
      const mockCases = [{ id: 1, title: 'Test Case' }] as any;
      getCases.mockReturnValue(mockCases);

      const result = client.getCases(1, 2, 3);

      expect(getCases).toHaveBeenCalledWith(expect.any(Object), 1, 2, 3);
      expect(result).toEqual(mockCases);
    });
  });

  describe('run methods', () => {
    it('should call addRun', () => {
      const mockRun = { id: 1 } as any;
      const testRun = { name: 'Test Run', suite_id: 1 } as any;
      addRun.mockReturnValue(mockRun);

      const result = client.addRun(1, testRun);

      expect(addRun).toHaveBeenCalledWith(expect.any(Object), 1, testRun);
      expect(result).toEqual(mockRun);
    });

    it('should call closeRun', () => {
      const mockRun = { id: 1 } as any;
      closeRun.mockReturnValue(mockRun);

      const result = client.closeRun(1);

      expect(closeRun).toHaveBeenCalledWith(expect.any(Object), 1);
      expect(result).toEqual(mockRun);
    });
  });

  describe('result methods', () => {
    it('should call addResults', () => {
      const mockResults = [{ case_id: 1, status_id: 1 }] as any;
      const results = [{ case_id: 1, status_id: 1 }] as any;
      addResults.mockReturnValue(mockResults);

      const result = client.addResults(1, results);

      expect(addResults).toHaveBeenCalledWith(expect.any(Object), 1, results);
      expect(result).toEqual(mockResults);
    });
  });

  describe('field methods', () => {
    it('should call getCaseFields', () => {
      const mockFields = [{ id: 1, system_name: 'custom_status' }] as any;
      getCaseFields.mockReturnValue(mockFields);

      const result = client.getCaseFields();

      expect(getCaseFields).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual(mockFields);
    });

    it('should call getResultFields', () => {
      const mockFields = [{ id: 1, system_name: 'custom_version' }] as any;
      getResultFields.mockReturnValue(mockFields);

      const result = client.getResultFields();

      expect(getResultFields).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual(mockFields);
    });

    it('should call getCustomStatus', () => {
      const mockStatus = 1;
      getCustomStatus.mockReturnValue(mockStatus);

      const result = client.getCustomStatus('Complete');

      expect(getCustomStatus).toHaveBeenCalledWith(
        expect.any(Object),
        'Complete',
      );
      expect(result).toEqual(mockStatus);
    });

    it('should call getCustomVersion', () => {
      const mockVersion = [1];
      getCustomVersion.mockReturnValue(mockVersion);

      const result = client.getCustomVersion('7.2.0.0');

      expect(getCustomVersion).toHaveBeenCalledWith(
        expect.any(Object),
        '7.2.0.0',
      );
      expect(result).toEqual(mockVersion);
    });
  });
});
