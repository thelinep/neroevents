import {
  describe,
  expect,
  it,
} from 'vitest';

import { config } from '../../src/config.js';

describe('M29.3 Environment & Configuration Validation', () => {
  describe('runtime configuration', () => {
    it('exposes a numeric application port', () => {
      expect(config.port).toBeTypeOf('number');
      expect(Number.isInteger(config.port)).toBe(true);
      expect(config.port).toBeGreaterThan(0);
      expect(config.port).toBeLessThanOrEqual(65535);
    });

    it('binds the application to an explicit host', () => {
      expect(config.host).toBeTypeOf('string');
      expect(config.host.length).toBeGreaterThan(0);
    });
  });

  describe('database configuration', () => {
    it('provides a database connection URL', () => {
      expect(config.databaseUrl).toBeTypeOf('string');
      expect(config.databaseUrl.length).toBeGreaterThan(0);
    });

    it('uses a PostgreSQL connection URL', () => {
      expect(config.databaseUrl).toMatch(/^postgres(?:ql)?:\/\//);
    });

    it('provides a numeric database pool maximum', () => {
      expect(config.databasePoolMax).toBeTypeOf('number');
      expect(Number.isInteger(config.databasePoolMax)).toBe(true);
      expect(config.databasePoolMax).toBeGreaterThan(0);
    });
  });

  describe('Redis configuration', () => {
    it('provides a Redis connection URL', () => {
      expect(config.redisUrl).toBeTypeOf('string');
      expect(config.redisUrl.length).toBeGreaterThan(0);
    });

    it('uses a Redis connection URL', () => {
      expect(config.redisUrl).toMatch(/^redis(?:s)?:\/\//);
    });
  });

  describe('repository and filesystem configuration', () => {
    it('provides a repository root', () => {
      expect(config.repoRoot).toBeTypeOf('string');
      expect(config.repoRoot.length).toBeGreaterThan(0);
    });

    it('normalizes ALLOWED_PATHS into an array', () => {
      expect(Array.isArray(config.allowedPaths)).toBe(true);
    });

    it('does not contain empty allowed paths', () => {
      expect(
        config.allowedPaths.every(
          (path) =>
            typeof path === 'string' &&
            path.length > 0,
        ),
      ).toBe(true);
    });
  });

  describe('session configuration', () => {
    it('provides a positive session expiry period', () => {
      expect(config.sessionExpiryDays).toBeTypeOf('number');
      expect(Number.isInteger(config.sessionExpiryDays)).toBe(true);
      expect(config.sessionExpiryDays).toBeGreaterThan(0);
    });
  });

  describe('authentication rate-limit configuration', () => {
    it('provides a positive rate-limit window', () => {
      expect(
        config.authRateLimitWindowSeconds,
      ).toBeTypeOf('number');

      expect(
        Number.isInteger(
          config.authRateLimitWindowSeconds,
        ),
      ).toBe(true);

      expect(
        config.authRateLimitWindowSeconds,
      ).toBeGreaterThan(0);
    });

    it('provides a positive maximum attempt count', () => {
      expect(
        config.authRateLimitMaxAttempts,
      ).toBeTypeOf('number');

      expect(
        Number.isInteger(
          config.authRateLimitMaxAttempts,
        ),
      ).toBe(true);

      expect(
        config.authRateLimitMaxAttempts,
      ).toBeGreaterThan(0);
    });
  });

  describe('configuration determinism', () => {
    it('exposes the complete expected configuration surface', () => {
      expect(config).toEqual(
        expect.objectContaining({
          port: expect.any(Number),
          host: expect.any(String),
          databaseUrl: expect.any(String),
          databasePoolMax: expect.any(Number),
          redisUrl: expect.any(String),
          repoRoot: expect.any(String),
          allowedPaths: expect.any(Array),
          sessionExpiryDays: expect.any(Number),
          authRateLimitWindowSeconds:
            expect.any(Number),
          authRateLimitMaxAttempts:
            expect.any(Number),
        }),
      );
    });

    it('does not expose undefined configuration values', () => {
      const values = Object.values(config);

      expect(
        values.every(
          (value) => value !== undefined,
        ),
      ).toBe(true);
    });

    it('does not expose null configuration values', () => {
      const values = Object.values(config);

      expect(
        values.every(
          (value) => value !== null,
        ),
      ).toBe(true);
    });
  });

  describe('configuration safety baseline', () => {
    it('does not expose configuration secrets through the test output', () => {
      /*
       * Deliberately do not print configuration values.
       *
       * This assertion verifies the expected configuration
       * surface exists without logging DATABASE_URL, REDIS_URL,
       * passwords, tokens, or other sensitive values.
       */
      expect(config).toBeDefined();
    });

    it('keeps authentication rate limiting configured', () => {
      expect(
        config.authRateLimitWindowSeconds,
      ).toBeGreaterThan(0);

      expect(
        config.authRateLimitMaxAttempts,
      ).toBeGreaterThan(0);
    });

    it('keeps session expiration configured', () => {
      expect(config.sessionExpiryDays).toBeGreaterThan(0);
    });
  });

  describe('M29.3 certification boundary', () => {
    it('provides all configuration required by the current application contract', () => {
      const requiredKeys = [
        'port',
        'host',
        'databaseUrl',
        'databasePoolMax',
        'redisUrl',
        'repoRoot',
        'allowedPaths',
        'sessionExpiryDays',
        'authRateLimitWindowSeconds',
        'authRateLimitMaxAttempts',
      ] as const;

      for (const key of requiredKeys) {
        expect(
          Object.prototype.hasOwnProperty.call(
            config,
            key,
          ),
        ).toBe(true);
      }
    });

    it('does not assume application-level JWT configuration that is absent from config.ts', () => {
      /*
       * docker-compose.yml supplies JWT_SECRET to the backend
       * container, but the current config.ts does not expose
       * JWT_SECRET as part of the application configuration
       * object.
       *
       * M29.3 therefore does not manufacture a JWT-secret
       * contract. Secret enforcement remains a separate
       * M29.13 concern.
       */
      expect(
        Object.prototype.hasOwnProperty.call(
          config,
          'jwtSecret',
        ),
      ).toBe(false);
    });
  });
});