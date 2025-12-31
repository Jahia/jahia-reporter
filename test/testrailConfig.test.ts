import type { TestRailConfig } from '../src/utils/testrail.interface.js';

import { createTestrailConfig } from '../src/utils/testrail/config.js';

describe('TestRail Config', () => {
  describe('createTestrailConfig', () => {
    const defaultParams = {
      base: 'https://testrail.example.com',
      password: 'testpass',
      username: 'testuser',
    };

    describe('URL normalization', () => {
      it('should add trailing slash when missing', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'https://testrail.example.com',
        });

        expect(config.base).toBe('https://testrail.example.com/');
        expect(config.url).toBe(
          'https://testrail.example.com/index.php?/api/v2/',
        );
      });

      it('should preserve trailing slash when present', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'https://testrail.example.com/',
        });

        expect(config.base).toBe('https://testrail.example.com/');
        expect(config.url).toBe(
          'https://testrail.example.com/index.php?/api/v2/',
        );
      });

      it('should handle localhost URLs correctly', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'http://localhost:8080/testrail',
        });

        expect(config.base).toBe('http://localhost:8080/testrail/');
        expect(config.url).toBe(
          'http://localhost:8080/testrail/index.php?/api/v2/',
        );
      });

      it('should handle URLs with paths correctly', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'https://company.testrail.io/path/to/instance',
        });

        expect(config.base).toBe(
          'https://company.testrail.io/path/to/instance/',
        );
        expect(config.url).toBe(
          'https://company.testrail.io/path/to/instance/index.php?/api/v2/',
        );
      });

      it('should handle URLs ending with multiple slashes', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'https://testrail.example.com///',
        });

        expect(config.base).toBe('https://testrail.example.com///');
        expect(config.url).toBe(
          'https://testrail.example.com///index.php?/api/v2/',
        );
      });

      it('should handle simple domain names', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          base: 'testrail.company.com',
        });

        expect(config.base).toBe('testrail.company.com/');
        expect(config.url).toBe('testrail.company.com/index.php?/api/v2/');
      });
    });

    describe('authentication encoding', () => {
      it('should encode username and password correctly using Buffer', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: 'testpass',
          username: 'testuser',
        });

        // Verify the encoding matches Buffer.from().toString('base64')
        const expectedAuth = Buffer.from(
          'testuser:testpass',
          'binary',
        ).toString('base64');
        expect(config.encodedAuth).toBe(expectedAuth);
      });

      it('should handle special characters in credentials', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: 'p@ssw0rd!',
          username: 'user@example.com',
        });

        const expectedAuth = Buffer.from(
          'user@example.com:p@ssw0rd!',
          'binary',
        ).toString('base64');
        expect(config.encodedAuth).toBe(expectedAuth);
      });

      it('should handle empty password', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: '',
          username: 'testuser',
        });

        const expectedAuth = Buffer.from('testuser:', 'binary').toString(
          'base64',
        );
        expect(config.encodedAuth).toBe(expectedAuth);
      });

      it('should handle username with colon', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: 'password',
          username: 'domain\\user:test',
        });

        const expectedAuth = Buffer.from(
          'domain\\user:test:password',
          'binary',
        ).toString('base64');
        expect(config.encodedAuth).toBe(expectedAuth);
      });

      it('should produce valid base64 encoding', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: 'secret123',
          username: 'admin',
        });

        // Test that the encoded string is valid base64
        expect(() => {
          Buffer.from(config.encodedAuth, 'base64');
        }).not.toThrow();

        // Test that it can be decoded back to original
        const decoded = Buffer.from(config.encodedAuth, 'base64').toString(
          'binary',
        );
        expect(decoded).toBe('admin:secret123');
      });
    });

    describe('rate limiting configuration', () => {
      it('should default enableRateLimiting to false when not specified', () => {
        const config = createTestrailConfig(defaultParams);

        expect(config.enableRateLimiting).toBe(false);
      });

      it('should set enableRateLimiting to true when specified', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          enableRateLimiting: true,
        });

        expect(config.enableRateLimiting).toBe(true);
      });

      it('should set enableRateLimiting to false when explicitly specified', () => {
        const config = createTestrailConfig({
          ...defaultParams,
          enableRateLimiting: false,
        });

        expect(config.enableRateLimiting).toBe(false);
      });
    });

    describe('complete configuration object', () => {
      it('should return a complete TestRailConfig object with all required properties', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com/',
          enableRateLimiting: true,
          password: 'secret123',
          username: 'admin',
        });

        const expectedAuth = Buffer.from('admin:secret123', 'binary').toString(
          'base64',
        );

        expect(config).toEqual({
          base: 'https://testrail.example.com/',
          enableRateLimiting: true,
          encodedAuth: expectedAuth,
          url: 'https://testrail.example.com/index.php?/api/v2/',
        });
      });

      it('should have correct TypeScript types', () => {
        const config: TestRailConfig = createTestrailConfig(defaultParams);

        expect(typeof config.base).toBe('string');
        expect(typeof config.url).toBe('string');
        expect(typeof config.encodedAuth).toBe('string');
        expect(typeof config.enableRateLimiting).toBe('boolean');
      });
    });

    describe('edge cases', () => {
      it('should handle empty base URL', () => {
        const config = createTestrailConfig({
          base: '',
          password: 'pass',
          username: 'user',
        });

        expect(config.base).toBe('/');
        expect(config.url).toBe('/index.php?/api/v2/');
      });

      it('should handle base URL with only slash', () => {
        const config = createTestrailConfig({
          base: '/',
          password: 'pass',
          username: 'user',
        });

        expect(config.base).toBe('/');
        expect(config.url).toBe('/index.php?/api/v2/');
      });

      it('should handle very long URLs', () => {
        const longBase =
          'https://very-long-subdomain.extremely-long-domain-name.example.com/very/long/path/to/testrail/instance';
        const config = createTestrailConfig({
          base: longBase,
          password: 'pass',
          username: 'user',
        });

        expect(config.base).toBe(longBase + '/');
        expect(config.url).toBe(longBase + '/index.php?/api/v2/');
      });

      it('should handle unicode characters in credentials', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: 'pæssword',
          username: 'üser',
        });

        const expectedAuth = Buffer.from('üser:pæssword', 'binary').toString(
          'base64',
        );
        expect(config.encodedAuth).toBe(expectedAuth);
      });

      it('should handle empty username and password', () => {
        const config = createTestrailConfig({
          base: 'https://testrail.example.com',
          password: '',
          username: '',
        });

        const expectedAuth = Buffer.from(':', 'binary').toString('base64');
        expect(config.encodedAuth).toBe(expectedAuth);
      });
    });

    describe('API endpoint construction', () => {
      it('should always construct the correct API endpoint path', () => {
        const testCases = [
          'https://testrail.example.com',
          'https://testrail.example.com/',
          'http://localhost:8080',
          'http://localhost:8080/',
          'testrail.local/instance',
          'testrail.local/instance/',
        ];

        for (const base of testCases) {
          const config = createTestrailConfig({
            base,
            password: 'pass',
            username: 'user',
          });

          expect(config.url).toMatch(/\/index\.php\?\/api\/v2\/$/);
        }
      });

      it('should maintain base URL protocol and host in API endpoint', () => {
        const config = createTestrailConfig({
          base: 'https://secure.testrail.company.com:8443/app',
          password: 'pass',
          username: 'user',
        });

        expect(config.url).toBe(
          'https://secure.testrail.company.com:8443/app/index.php?/api/v2/',
        );
      });
    });

    describe('real-world scenarios', () => {
      it('should handle typical production configuration', () => {
        const config = createTestrailConfig({
          base: 'https://company.testrail.io',
          enableRateLimiting: true,
          password: 'api-token-xyz123',
          username: 'ci-user@company.com',
        });

        expect(config.base).toBe('https://company.testrail.io/');
        expect(config.url).toBe(
          'https://company.testrail.io/index.php?/api/v2/',
        );
        expect(config.enableRateLimiting).toBe(true);

        // Verify encoding can be decoded correctly
        const decoded = Buffer.from(config.encodedAuth, 'base64').toString(
          'binary',
        );
        expect(decoded).toBe('ci-user@company.com:api-token-xyz123');
      });

      it('should handle self-hosted TestRail instance', () => {
        const config = createTestrailConfig({
          base: 'http://testrail.internal.company.com:8080/testrail',
          password: 'complex_P@ssw0rd!',
          username: 'admin',
        });

        expect(config.base).toBe(
          'http://testrail.internal.company.com:8080/testrail/',
        );
        expect(config.url).toBe(
          'http://testrail.internal.company.com:8080/testrail/index.php?/api/v2/',
        );
        expect(config.enableRateLimiting).toBe(false);
      });

      it('should handle development environment', () => {
        const config = createTestrailConfig({
          base: 'http://localhost:3000',
          enableRateLimiting: false,
          password: 'dev',
          username: 'dev',
        });

        expect(config.base).toBe('http://localhost:3000/');
        expect(config.url).toBe('http://localhost:3000/index.php?/api/v2/');
        expect(config.enableRateLimiting).toBe(false);
      });
    });
  });
});
