import { getIncidentDescription } from '../src/utils/incidents/getIncidentDescription.js';

describe('getIncidentDescription', () => {
  const baseParams = {
    dedupKey: 'test-dedup-key-123',
    incidentDetails: '',
    incidentMessage: '',
    runUrl: '',
    service: 'test-service',
  };

  describe('when incidentDetails is provided', () => {
    it('should return description with incident details only', () => {
      const result = getIncidentDescription({
        ...baseParams,
        incidentDetails: 'Detailed error information here',
      });

      expect(result).toContain(
        'An error occurred during the test execution workflow.',
      );
      expect(result).toContain('**Details:**');
      expect(result).toContain('Detailed error information here');
      // Should not include other fields when incidentDetails is provided
      expect(result).not.toContain('**Source URL:**');
      expect(result).not.toContain('**Service:**');
      expect(result).not.toContain('**Dedup Key:**');
    });

    it('should return early when incidentDetails is non-empty', () => {
      const result = getIncidentDescription({
        ...baseParams,
        dedupKey: 'some-key',
        incidentDetails: 'Error details',
        incidentMessage: 'This should be ignored',
        runUrl: 'https://example.com',
        service: 'my-service',
      });

      expect(result).toContain('Error details');
      expect(result).not.toContain('This should be ignored');
      expect(result).not.toContain('https://example.com');
    });
  });

  describe('when incidentDetails is empty', () => {
    it('should include the no test output message', () => {
      const result = getIncidentDescription(baseParams);

      expect(result).toContain(
        'No test output is available, please look into the provided link below or the repository workflows',
      );
    });

    it('should include incidentMessage when provided', () => {
      const result = getIncidentDescription({
        ...baseParams,
        incidentMessage: 'Custom error message',
      });

      expect(result).toContain('**Details:** Custom error message');
    });

    it('should include runUrl when provided', () => {
      const result = getIncidentDescription({
        ...baseParams,
        runUrl: 'https://github.com/org/repo/actions/runs/123',
      });

      expect(result).toContain(
        '**Source URL:** https://github.com/org/repo/actions/runs/123',
      );
    });

    it('should include service when provided', () => {
      const result = getIncidentDescription({
        ...baseParams,
        service: 'my-test-service',
      });

      expect(result).toContain('**Service:** my-test-service');
    });

    it('should include dedupKey when provided', () => {
      const result = getIncidentDescription({
        ...baseParams,
        dedupKey: 'unique-dedup-key-456',
      });

      expect(result).toContain('**Dedup Key:** unique-dedup-key-456');
    });

    it('should include all fields when all are provided', () => {
      const result = getIncidentDescription({
        dedupKey: 'dedup-123',
        incidentDetails: '',
        incidentMessage: 'Something went wrong',
        runUrl: 'https://ci.example.com/build/999',
        service: 'api-service',
      });

      expect(result).toContain(
        'An error occurred during the test execution workflow.',
      );
      expect(result).toContain('**Details:** Something went wrong');
      expect(result).toContain(
        '**Source URL:** https://ci.example.com/build/999',
      );
      expect(result).toContain('**Service:** api-service');
      expect(result).toContain('**Dedup Key:** dedup-123');
    });
  });

  describe('edge cases', () => {
    it('should handle empty service', () => {
      const result = getIncidentDescription({
        ...baseParams,
        service: '',
      });

      expect(result).not.toContain('**Service:**');
    });

    it('should handle empty dedupKey', () => {
      const result = getIncidentDescription({
        ...baseParams,
        dedupKey: '',
      });

      expect(result).not.toContain('**Dedup Key:**');
    });

    it('should handle empty incidentMessage', () => {
      const result = getIncidentDescription({
        ...baseParams,
        incidentMessage: '',
      });

      expect(result).not.toContain('**Details:**');
    });

    it('should handle undefined runUrl', () => {
      const result = getIncidentDescription({
        dedupKey: 'key',
        incidentDetails: '',
        incidentMessage: '',
        runUrl: undefined,
        service: 'svc',
      });

      expect(result).not.toContain('**Source URL:**');
    });
  });
});
