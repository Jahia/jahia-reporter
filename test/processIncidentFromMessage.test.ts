import * as fs from 'node:fs';

// Mock uuid before importing the module that uses it
// Use content-based mock to ensure same inputs give same outputs
jest.mock('uuid', () => ({
  v5: jest.fn().mockImplementation((content: string) => {
    // Create a simple hash from content for deterministic but unique values
    return `mocked-uuid-${content.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
  }),
}));

import { processIncidentFromMessage } from '../src/utils/incidents/processIncidentFromMessage.js';

// Mock fs module
jest.mock('node:fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));

const mockExistsSync = fs.existsSync as jest.MockedFunction<
  typeof fs.existsSync
>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<
  typeof fs.readFileSync
>;

describe('processIncidentFromMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic incident creation', () => {
    it('should create incident with provided message', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Test failure occurred',
        service: 'test-service',
      });

      expect(result).toEqual({
        counts: {
          fail: 1,
          skip: 0,
          success: 0,
          total: 1,
        },
        dedupKey: expect.any(String),
        description: 'Test failure occurred',
        service: 'test-service',
        sourceUrl: '',
        title: 'test-service - Test failure occurred',
      });
    });

    it('should use default message when empty message provided', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: '',
        service: 'my-service',
      });

      expect(result.title).toBe(
        'my-service - Incident occurred (no error message provided)',
      );
      expect(result.description).toBe(
        'Incident occurred (no error message provided)',
      );
    });

    it('should generate consistent dedupKey for same title', async () => {
      mockExistsSync.mockReturnValue(false);

      const result1 = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Same error',
        service: 'same-service',
      });

      const result2 = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Same error',
        service: 'same-service',
      });

      expect(result1.dedupKey).toBe(result2.dedupKey);
    });

    it('should generate different dedupKey for different titles', async () => {
      mockExistsSync.mockReturnValue(false);

      const result1 = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Error A',
        service: 'service-a',
      });

      const result2 = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Error B',
        service: 'service-b',
      });

      expect(result1.dedupKey).not.toBe(result2.dedupKey);
    });
  });

  describe('incident details file handling', () => {
    it('should append file content when incidentDetailsPath exists', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        Buffer.from('Detailed error logs from file'),
      );

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '/path/to/error.log',
        message: 'Test failed',
        service: 'test-service',
      });

      expect(mockExistsSync).toHaveBeenCalledWith('/path/to/error.log');
      expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/error.log');
      expect(result.description).toBe(
        'Test failed\n\nDetailed error logs from file',
      );
    });

    it('should not read file when incidentDetailsPath is empty', async () => {
      const result = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Test failed',
        service: 'test-service',
      });

      expect(mockExistsSync).not.toHaveBeenCalled();
      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(result.description).toBe('Test failed');
    });

    it('should not read file when file does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '/nonexistent/path.log',
        message: 'Error occurred',
        service: 'test-service',
      });

      expect(mockExistsSync).toHaveBeenCalledWith('/nonexistent/path.log');
      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(result.description).toBe('Error occurred');
    });
  });

  describe('counts property', () => {
    it('should always return fixed counts for message incidents', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Any message',
        service: 'any-service',
      });

      expect(result.counts).toEqual({
        fail: 1,
        skip: 0,
        success: 0,
        total: 1,
      });
    });
  });

  describe('sourceUrl property', () => {
    it('should always return empty sourceUrl', async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await processIncidentFromMessage({
        incidentDetailsPath: '',
        message: 'Test message',
        service: 'test-service',
      });

      expect(result.sourceUrl).toBe('');
    });
  });
});
