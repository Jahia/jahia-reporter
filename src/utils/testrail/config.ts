import type { TestRailConfig } from '../../types/index.js';

// Utility function for basic auth encoding
const encode = (str: string): string =>
  Buffer.from(str, 'binary').toString('base64');

export const createTestrailConfig = ({
  base,
  enableRateLimiting = false,
  password,
  username,
}: {
  base: string;
  enableRateLimiting?: boolean;
  password: string;
  username: string;
}): TestRailConfig => {
  const normalizedBase = base.slice(-1) === '/' ? base : base + '/';
  return {
    base: normalizedBase,
    enableRateLimiting,
    encodedAuth: encode(username + ':' + password),
    url: normalizedBase + 'index.php?/api/v2/',
  };
};
