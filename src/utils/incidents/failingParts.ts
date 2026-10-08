// An incident can be reported by several parts of one run (the lanes of a matrix, for example),
// each reporting on its own. The issue body keeps the parts currently failing in a hidden marker,
// so that the issue stays open until the last failing part passes again.
const MARKER = /<!-- jahia-reporter:failing-parts (.*?) -->/;

// Returns the parts recorded in the issue body, or null when the body carries no marker (an
// issue created without --incidentPart, whose failing parts are unknown)
export const readFailingParts = (body: string): null | string[] => {
  const match = (body || '').match(MARKER);
  if (match === null) {
    return null;
  }

  try {
    const parts = JSON.parse(match[1]);
    return Array.isArray(parts) ? parts.map(String) : null;
  } catch {
    return null;
  }
};

// Returns the body with the marker set to the given parts, replacing the existing one if any
export const writeFailingParts = (body: string, parts: string[]): string => {
  const marker = `<!-- jahia-reporter:failing-parts ${JSON.stringify(parts)} -->`;
  const current = body || '';
  return MARKER.test(current)
    ? current.replace(MARKER, marker)
    : `${current}\n\n${marker}`;
};

// The parts failing once a part has reported
export const nextFailingParts = ({
  failed,
  part,
  parts,
}: {
  failed: boolean;
  part: string;
  parts: string[];
}): string[] =>
  failed
    ? [...parts.filter((p) => p !== part), part]
    : parts.filter((p) => p !== part);
