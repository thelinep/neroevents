import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = path.resolve(process.cwd(), '../..');

const COMPOSE_PATH = path.join(
  PROJECT_ROOT,
  'docker-compose.yml',
);

const API_DOCKERFILE = path.join(
  PROJECT_ROOT,
  'apps',
  'api',
  'Dockerfile',
);

const WEB_DOCKERFILE = path.join(
  PROJECT_ROOT,
  'apps',
  'web',
  'Dockerfile',
);

const WEB_SOURCE = path.join(
  PROJECT_ROOT,
  'apps',
  'web',
);

const GITIGNORE_PATH = path.join(
  PROJECT_ROOT,
  '.gitignore',
);

const SECRET_POLICY = path.join(
  PROJECT_ROOT,
  'infrastructure',
  'secrets',
  'README.md',
);

const compose = fs.readFileSync(
  COMPOSE_PATH,
  'utf8',
);

const apiDockerfile = fs.readFileSync(
  API_DOCKERFILE,
  'utf8',
);

const webDockerfile = fs.readFileSync(
  WEB_DOCKERFILE,
  'utf8',
);

const gitignore = fs.existsSync(GITIGNORE_PATH)
  ? fs.readFileSync(GITIGNORE_PATH, 'utf8')
  : '';

function collectFiles(
  directory: string,
): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const result: string[] = [];

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === '.git'
    ) {
      continue;
    }

    const fullPath = path.join(
      directory,
      entry.name,
    );

    if (entry.isDirectory()) {
      result.push(...collectFiles(fullPath));
    } else {
      result.push(fullPath);
    }
  }

  return result;
}

function webSourceText(): string {
  return collectFiles(WEB_SOURCE)
    .filter((file) =>
      /\.(ts|tsx|js|jsx|json|env|yaml|yml)$/.test(file),
    )
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

const webSource = webSourceText();

describe(
  'M29.7 Production Secrets, Credentials & Secret-Management Hardening',
  () => {
    describe('Secret policy', () => {
      it('defines a production secret-management policy', () => {
        expect(
          fs.existsSync(SECRET_POLICY),
        ).toBe(true);
      });

      it('documents that secrets must not be committed', () => {
        const policy = fs.readFileSync(
          SECRET_POLICY,
          'utf8',
        );

        expect(policy).toMatch(
          /never be committed|never commit/i,
        );
      });

      it('documents external production secret provisioning', () => {
        const policy = fs.readFileSync(
          SECRET_POLICY,
          'utf8',
        );

        expect(policy).toMatch(
          /deployment environment|secret-management|secret management/i,
        );
      });
    });

    describe('Compose secret boundary', () => {
      it('requires JWT_SECRET instead of silently defaulting it', () => {
        expect(compose).toContain(
          'JWT_SECRET: ${JWT_SECRET:?JWT_SECRET must be provided}',
        );
      });

      it('does not hard-code a JWT production secret', () => {
        const jwtLine = compose
            .split('\n')
            .find((line) => line.includes('JWT_SECRET:'));

        expect(jwtLine).toBeDefined();
        expect(jwtLine).toMatch(
            /^\s*JWT_SECRET:\s*\$\{JWT_SECRET:\?JWT_SECRET must be provided\}\s*$/,
        );
      });

      it('does not use the old development JWT fallback', () => {
        expect(compose).not.toContain(
          'change-me-in-development',
        );
      });

      it('does not embed an explicit production JWT value', () => {
        expect(compose).not.toMatch(
          /JWT_SECRET:\s*["']?[A-Za-z0-9+/=_-]{20,}/,
        );
      });

      it('does not embed a database password in DATABASE_URL', () => {
        expect(compose).not.toMatch(
          /DATABASE_URL:\s*postgresql:\/\/[^:]+:[^@]+@/,
        );
      });

      it('does not embed a Redis password in REDIS_URL', () => {
        expect(compose).not.toMatch(
          /REDIS_URL:\s*redis:\/\/[^:]+:[^@]+@/,
        );
      });
    });

    describe('Dockerfile secret isolation', () => {
      it('does not declare secret build arguments in the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /^ARG .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );
      });

      it('does not declare secret environment variables in the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /^ENV .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );
      });

      it('does not copy environment files into the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /(?:COPY|ADD).*\.env/,
        );
      });

      it('does not copy TLS private material into the API image', () => {
        expect(apiDockerfile).not.toMatch(
          /(?:COPY|ADD).*\.(pem|key)/,
        );
      });

      it('does not declare secret build arguments in the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /^ARG .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );
      });

      it('does not declare secret environment variables in the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /^ENV .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );
      });

      it('does not copy environment files into the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /(?:COPY|ADD).*\.env/,
        );
      });

      it('does not copy TLS private material into the frontend image', () => {
        expect(webDockerfile).not.toMatch(
          /(?:COPY|ADD).*\.(pem|key)/,
        );
      });
    });

    describe('Frontend secret isolation', () => {
      it('does not reference JWT_SECRET in frontend source', () => {
        expect(webSource).not.toContain(
          'JWT_SECRET',
        );
      });

      it('does not reference DATABASE_URL in frontend source', () => {
        expect(webSource).not.toContain(
          'DATABASE_URL',
        );
      });

      it('does not reference REDIS_URL in frontend source', () => {
        expect(webSource).not.toContain(
          'REDIS_URL',
        );
      });

      it('does not reference database passwords in frontend source', () => {
        expect(webSource).not.toMatch(
          /POSTGRES_PASSWORD|DATABASE_PASSWORD/i,
        );
      });

      it('does not reference TLS private keys in frontend source', () => {
        expect(webSource).not.toMatch(
          /privkey\.pem|PRIVATE_KEY/i,
        );
      });
    });

    describe('Git secret exclusion', () => {
      it('ignores environment files', () => {
        expect(gitignore).toContain(
          '.env',
        );
      });

      it('ignores TLS PEM files', () => {
        expect(gitignore).toMatch(
          /infrastructure\/tls\/.*\.pem/,
        );
      });

      it('ignores TLS key files', () => {
        expect(gitignore).toMatch(
          /infrastructure\/tls\/.*\.key/,
        );
      });

      it('protects the production secret directory', () => {
        expect(gitignore).toMatch(
          /infrastructure\/secrets/,
        );
      });
    });

    describe('Secret exposure baseline', () => {
      it('does not contain a conventional production password in Compose', () => {
        expect(compose).not.toMatch(
          /PASSWORD:\s*(production|prod|secret|changeme|change-me)/i,
        );
      });

      it('does not contain obvious API keys in Compose', () => {
        expect(compose).not.toMatch(
          /API_KEY:\s*["']?[A-Za-z0-9_-]{20,}/i,
        );
      });

      it('does not contain bearer tokens in Compose', () => {
        expect(compose).not.toMatch(
          /Bearer\s+[A-Za-z0-9._-]{20,}/i,
        );
      });
    });

    describe('M29.7 certification boundary', () => {
      it('requires production JWT secret provisioning', () => {
        expect(compose).toContain(
          '${JWT_SECRET:?JWT_SECRET must be provided}',
        );
      });

      it('does not silently use the development JWT secret', () => {
        expect(compose).not.toContain(
          'change-me-in-development',
        );
      });

      it('does not embed secrets in application images', () => {
        expect(apiDockerfile).not.toMatch(
          /^(ARG|ENV) .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );

        expect(webDockerfile).not.toMatch(
          /^(ARG|ENV) .*?(SECRET|PASSWORD|TOKEN|API_KEY)/im,
        );
      });

      it('does not expose backend secrets to the frontend', () => {
        expect(webSource).not.toMatch(
          /JWT_SECRET|DATABASE_URL|REDIS_URL|POSTGRES_PASSWORD/i,
        );
      });

      it('defines a secret-management policy', () => {
        expect(
          fs.existsSync(SECRET_POLICY),
        ).toBe(true);
      });

      it('defines Git exclusion for secret material', () => {
        expect(gitignore).toMatch(
          /\.env/,
        );

        expect(gitignore).toMatch(
          /infrastructure\/tls/,
        );
      });
    });
  },
);