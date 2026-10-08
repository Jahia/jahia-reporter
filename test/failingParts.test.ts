import {
  nextFailingParts,
  readFailingParts,
  writeFailingParts,
} from '../src/utils/incidents/failingParts.js';

describe('failingParts', () => {
  describe('readFailingParts', () => {
    it('should return null when the body carries no marker', () => {
      expect(readFailingParts('**Dedup Key:** abc')).toBeNull();
      expect(readFailingParts('')).toBeNull();
    });

    it('should return the parts recorded in the marker', () => {
      const body =
        'Body\n\n<!-- jahia-reporter:failing-parts ["Linux cluster","Windows cluster"] -->';
      expect(readFailingParts(body)).toEqual([
        'Linux cluster',
        'Windows cluster',
      ]);
    });

    it('should return null when the marker is not a list', () => {
      expect(
        readFailingParts('<!-- jahia-reporter:failing-parts {oops -->'),
      ).toBeNull();
    });
  });

  describe('writeFailingParts', () => {
    it('should append the marker to a body without one', () => {
      const body = writeFailingParts('Body', ['Linux cluster']);
      expect(body).toBe(
        'Body\n\n<!-- jahia-reporter:failing-parts ["Linux cluster"] -->',
      );
      expect(readFailingParts(body)).toEqual(['Linux cluster']);
    });

    it('should replace the existing marker', () => {
      const body = writeFailingParts(
        writeFailingParts('Body', ['Linux cluster', 'Windows cluster']),
        ['Windows cluster'],
      );
      expect(readFailingParts(body)).toEqual(['Windows cluster']);
      expect(body.match(/failing-parts/g)).toHaveLength(1);
    });
  });

  describe('nextFailingParts', () => {
    it('should add a failing part once', () => {
      expect(
        nextFailingParts({ failed: true, part: 'B', parts: ['A'] }),
      ).toEqual(['A', 'B']);
      expect(
        nextFailingParts({ failed: true, part: 'A', parts: ['A'] }),
      ).toEqual(['A']);
    });

    it('should remove a part that passes, and leave the others failing', () => {
      expect(
        nextFailingParts({ failed: false, part: 'A', parts: ['A', 'B'] }),
      ).toEqual(['B']);
      expect(
        nextFailingParts({ failed: false, part: 'B', parts: ['B'] }),
      ).toEqual([]);
    });

    it('should leave the parts unchanged when a part that was not failing passes', () => {
      expect(
        nextFailingParts({ failed: false, part: 'C', parts: ['A'] }),
      ).toEqual(['A']);
    });
  });
});
