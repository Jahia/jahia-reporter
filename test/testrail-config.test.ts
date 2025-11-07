import { createConfig } from '../src/utils/testrail/config.js';

describe('TestRail Config', () => {
  describe('createConfig', () => {
    it('should create config with basic parameters', () => {
      const config = createConfig(
        'https://test.testrail.io',
        'user@test.com',
        'password123',
      );

      expect(config.base).toBe('https://test.testrail.io/');
      expect(config.username).toBe('user@test.com');
      expect(config.password).toBe('password123');
      expect(config.url).toBe('https://test.testrail.io/index.php?/api/v2/');
      expect(config.enableRateLimiting).toBeUndefined();
    });

    it('should create config with rate limiting enabled', () => {
      const config = createConfig(
        'https://test.testrail.io',
        'user@test.com',
        'password123',
        true,
      );

      expect(config.base).toBe('https://test.testrail.io/');
      expect(config.username).toBe('user@test.com');
      expect(config.password).toBe('password123');
      expect(config.url).toBe('https://test.testrail.io/index.php?/api/v2/');
      expect(config.enableRateLimiting).toBe(true);
    });

    it('should handle base URL without trailing slash', () => {
      const config = createConfig(
        'https://test.testrail.io',
        'user@test.com',
        'password123',
      );

      expect(config.base).toBe('https://test.testrail.io/');
      expect(config.url).toBe('https://test.testrail.io/index.php?/api/v2/');
    });

    it('should handle base URL with trailing slash', () => {
      const config = createConfig(
        'https://test.testrail.io/',
        'user@test.com',
        'password123',
      );

      expect(config.base).toBe('https://test.testrail.io/');
      expect(config.url).toBe('https://test.testrail.io/index.php?/api/v2/');
    });

    it('should create config with rate limiting disabled', () => {
      const config = createConfig(
        'https://test.testrail.io',
        'user@test.com',
        'password123',
        false,
      );

      expect(config.enableRateLimiting).toBe(false);
    });
  });
});
