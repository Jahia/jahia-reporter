import type { Project, Suite, TestRailConfig } from '../src/types/index.js';

import {
  addTestrailSection,
  getTestrailParentSection,
  getTestrailSections,
} from '../src/utils/testrail/sections.js';
import { sendRequest } from '../src/utils/testrail/client.js';

// Mock the client module
jest.mock('../src/utils/testrail/client.js', () => ({
  sendRequest: jest.fn(),
}));

// Mock console.log
const originalConsoleLog = console.log;

const mockSendRequest = sendRequest as jest.MockedFunction<typeof sendRequest>;

describe('TestRail Sections', () => {
  const mockConfig: TestRailConfig = {
    base: 'https://testrail.example.com',
    encodedAuth: 'dXNlcm5hbWU6cGFzc3dvcmQ=',
    url: 'https://testrail.example.com/index.php?/api/v2/',
  };

  const mockProject: Project = {
    id: 10,
    is_completed: false,
    name: 'Test Project',
    show_announcement: false,
    suite_mode: 3,
    url: 'https://testrail.example.com/index.php?/projects/overview/10',
  };

  const mockSuite: Suite = {
    id: 20,
    name: 'Test Suite',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('getTestrailSections', () => {
    it('should return sections when size > 0', async () => {
      const mockSections = [
        { id: 1, name: 'Section 1', parent_id: 0 },
        { id: 2, name: 'Section 2', parent_id: 0 },
      ];
      mockSendRequest
        .mockReturnValueOnce({
          _links: { next: '', prev: null },
          limit: 250,
          offset: 0,
          sections: mockSections,
          size: 2,
        })
        .mockReturnValueOnce({
          _links: { next: '', prev: '' },
          limit: 250,
          offset: 2,
          sections: [],
          size: 0,
        });

      const result = await getTestrailSections(mockConfig, 10, 20);

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'GET',
        'get_sections/10&suite_id=20',
        '',
      );
      expect(result).toEqual(mockSections);
    });

    it('should return empty array when size is 0', async () => {
      mockSendRequest.mockReturnValue({
        _links: { next: '', prev: null },
        limit: 250,
        offset: 0,
        sections: [],
        size: 0,
      });

      const result = await getTestrailSections(mockConfig, 10, 20);

      expect(result).toEqual([]);
    });

    it('should paginate through all sections', async () => {
      const section1 = { id: 1, name: 'Section 1', parent_id: 0 };
      const section2 = { id: 2, name: 'Section 2', parent_id: 0 };
      const section3 = { id: 3, name: 'Section 3', parent_id: 0 };

      mockSendRequest
        .mockReturnValueOnce({
          _links: { next: '/next', prev: null },
          limit: 2,
          offset: 0,
          sections: [section1, section2],
          size: 2,
        })
        .mockReturnValueOnce({
          _links: { next: '', prev: '/prev' },
          limit: 2,
          offset: 2,
          sections: [section3],
          size: 1,
        })
        .mockReturnValueOnce({
          _links: { next: '', prev: '' },
          limit: 2,
          offset: 3,
          sections: [],
          size: 0,
        });

      const result = await getTestrailSections(mockConfig, 10, 20);

      expect(result).toEqual([section1, section2, section3]);
      expect(mockSendRequest).toHaveBeenCalledTimes(3);
    });

    it('should respect hard limit on pagination', async () => {
      // Setup mock to always return sections (simulating infinite loop scenario)
      mockSendRequest.mockReturnValue({
        _links: { next: '/next', prev: null },
        limit: 1,
        offset: 0,
        sections: [{ id: 1, name: 'Section', parent_id: 0 }],
        size: 1,
      });

      await getTestrailSections(mockConfig, 10, 20);

      // Initial call + 50 hard limit iterations + 1 for the check after loop
      expect(mockSendRequest.mock.calls.length).toBeLessThanOrEqual(52);
    });
  });

  describe('addTestrailSection', () => {
    it('should add section without parent ID', async () => {
      const mockResponse = { id: 100, name: 'New Section', parent_id: 0 };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailSection(mockConfig, 10, {
        section: 'New Section',
        suiteId: 20,
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_section/10',
        { name: 'New Section', suite_id: '20' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should add section with parent ID', async () => {
      const mockResponse = { id: 101, name: 'Child Section', parent_id: 50 };
      mockSendRequest.mockReturnValue(mockResponse);

      const result = await addTestrailSection(mockConfig, 10, {
        parentId: '50',
        section: 'Child Section',
        suiteId: 20,
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_section/10',
        { name: 'Child Section', parent_id: '50', suite_id: '20' },
      );
      expect(result).toEqual(mockResponse);
    });

    it('should not include parent_id when empty string', async () => {
      mockSendRequest.mockReturnValue({
        id: 102,
        name: 'Section',
        parent_id: 0,
      });

      await addTestrailSection(mockConfig, 10, {
        parentId: '',
        section: 'Section',
        suiteId: 20,
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_section/10',
        { name: 'Section', suite_id: '20' },
      );
    });
  });

  describe('getTestrailParentSection', () => {
    const mockLog = jest.fn();

    it('should return null when parentSectionName is empty', async () => {
      const result = await getTestrailParentSection({
        config: mockConfig,
        log: mockLog,
        parentSectionName: '',
        project: mockProject,
        suite: mockSuite,
        testrailSections: [],
      });

      expect(result).toBeNull();
      expect(mockSendRequest).not.toHaveBeenCalled();
    });

    it('should return existing section when found', async () => {
      const existingSections = [
        { id: 1, name: 'Parent Section', parent_id: 0 },
        { id: 2, name: 'Other Section', parent_id: 0 },
      ];

      const result = await getTestrailParentSection({
        config: mockConfig,
        log: mockLog,
        parentSectionName: 'Parent Section',
        project: mockProject,
        suite: mockSuite,
        testrailSections: existingSections,
      });

      expect(result).toEqual({ id: 1, name: 'Parent Section', parent_id: 0 });
      expect(mockLog).toHaveBeenCalledWith(
        "Found existing section 'Parent Section' with ID: 1",
      );
    });

    it('should create section when not found', async () => {
      const existingSections = [{ id: 1, name: 'Other Section', parent_id: 0 }];
      const newSection = { id: 100, name: 'New Parent', parent_id: 0 };
      mockSendRequest.mockReturnValue(newSection);

      const result = await getTestrailParentSection({
        config: mockConfig,
        log: mockLog,
        parentSectionName: 'New Parent',
        project: mockProject,
        suite: mockSuite,
        testrailSections: existingSections,
      });

      expect(result).toEqual(newSection);
      expect(mockLog).toHaveBeenCalledWith(
        "Failed to find section named 'New Parent' in project 'Test Project'. Creating the section now.",
      );
      expect(mockLog).toHaveBeenCalledWith(
        "Created section 'New Parent' with ID: 100",
      );
    });

    it('should call addTestrailSection with correct parameters', async () => {
      const newSection = { id: 101, name: 'Created Section', parent_id: 0 };
      mockSendRequest.mockReturnValue(newSection);

      await getTestrailParentSection({
        config: mockConfig,
        log: mockLog,
        parentSectionName: 'Created Section',
        project: mockProject,
        suite: mockSuite,
        testrailSections: [],
      });

      expect(mockSendRequest).toHaveBeenCalledWith(
        mockConfig,
        'POST',
        'add_section/10',
        { name: 'Created Section', suite_id: '20' },
      );
    });
  });
});
