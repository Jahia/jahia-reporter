import type { TestRailConfig } from '../testrail.interface.js';

// Utility function for basic auth encoding
const encode = (str: string): string =>
  Buffer.from(str, 'binary').toString('base64');

export const createTestrailConfig = ({
  base,
  username,
  password,
  enableRateLimiting = false,
}: {
  base: string;
  username: string;
  password: string;
  enableRateLimiting?: boolean;
}): TestRailConfig => {
  const normalizedBase = base.slice(-1) === '/' ? base : base + '/';
  return {
    base: normalizedBase,
    enableRateLimiting,
    encodedAuth: encode(username + ':' + password),
    url: normalizedBase + 'index.php?/api/v2/',
  };
};
