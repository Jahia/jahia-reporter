// TestRail client configuration and types
export interface TestRailConfig {
  base: string;
  enableRateLimiting?: boolean;
  password: string;
  url: string;
  username: string;
}

export interface RequestParams {
  data?: object | string;
  method: 'GET' | 'POST';
  uri: string;
}

// Utility function for basic auth encoding
export const encode = (str: string): string =>
  Buffer.from(str, 'binary').toString('base64');

// Create TestRail configuration
export const createConfig = (
  base: string,
  username: string,
  password: string,
  enableRateLimiting?: boolean,
): TestRailConfig => {
  const normalizedBase = base.slice(-1) === '/' ? base : base + '/';
  return {
    base: normalizedBase,
    enableRateLimiting,
    password,
    url: normalizedBase + 'index.php?/api/v2/',
    username,
  };
};

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
    username,
    password,
    url: normalizedBase + 'index.php?/api/v2/',
  };
};
