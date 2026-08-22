import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  existsSync,
  readFileSync,
} from 'node:fs';
import {
  dirname,
  join,
  resolve,
} from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const TEST_FILE = fileURLToPath(import.meta.url);
const API_DIR = resolve(dirname(TEST_FILE), '../..');
const REPO_ROOT = resolve(API_DIR, '../..');

const API_DOCKERFILE = join(
  REPO_ROOT,
  'apps/api/Dockerfile',
);

const WEB_DOCKERFILE = join(
  REPO_ROOT,
  'apps/web/Dockerfile',
);

const ROOT_DOCKERIGNORE = join(
  REPO_ROOT,
  '.dockerignore',
);

const API_DOCKERIGNORE = join(
  REPO_ROOT,
  'apps/api/.dockerignore',
);

const WEB_DOCKERIGNORE = join(
  REPO_ROOT,
  'apps/web/.dockerignore',
);

const ROOT_PACKAGE = join(
  REPO_ROOT,
  'package.json',
);

const API_PACKAGE = join(
  REPO_ROOT,
  'apps/api/package.json',
);

const WEB_PACKAGE = join(
  REPO_ROOT,
  'apps/web/package.json',
);

function readRequiredFile(path: string): string {
  expect(
    existsSync(path),
    `Required production file does not exist: ${path}`,
  ).toBe(true);

  return readFileSync(path, 'utf8');
}

function readJson(path: string): Record<string, unknown> {
  const source = readRequiredFile(path);

  return JSON.parse(source) as Record<string, unknown>;
}

function hasInstruction(
  dockerfile: string,
  instruction: string,
  value?: string,
): boolean {
  const lines = dockerfile
    .split(/\r?\n/)
    .map((line) => line.trim());

  return lines.some((line) => {
    if (!line.toUpperCase().startsWith(instruction.toUpperCase())) {
      return false;
    }

    if (value === undefined) {
      return true;
    }

    return line.includes(value);
  });
}

function packageScripts(
  packageJson: Record<string, unknown>,
): Record<string, string> {
  return (packageJson.scripts ?? {}) as Record<string, string>;
}

describe(
  'M29.4 Production Image & Container Hardening',
  () => {
    const apiDockerfile = readRequiredFile(
      API_DOCKERFILE,
    );

    const webDockerfile = readRequiredFile(
      WEB_DOCKERFILE,
    );

    const rootDockerignore = readRequiredFile(
      ROOT_DOCKERIGNORE,
    );

    const apiDockerignore = readRequiredFile(
      API_DOCKERIGNORE,
    );

    const webDockerignore = readRequiredFile(
      WEB_DOCKERIGNORE,
    );

    const rootPackage = readJson(ROOT_PACKAGE);
    const apiPackage = readJson(API_PACKAGE);
    const webPackage = readJson(WEB_PACKAGE);

    describe('production build definitions', () => {
      it('uses a dedicated backend build stage', () => {
        expect(apiDockerfile).toMatch(
          /^FROM\s+node:22-alpine\s+AS\s+build$/m,
        );
      });

      it('uses a dedicated backend runtime stage', () => {
        expect(apiDockerfile).toMatch(
          /^FROM\s+node:22-alpine\s+AS\s+runtime$/m,
        );
      });

      it('uses a dedicated frontend build stage', () => {
        expect(webDockerfile).toMatch(
          /^FROM\s+node:22-alpine\s+AS\s+build$/m,
        );
      });

      it('uses nginx as the frontend production runtime', () => {
        expect(webDockerfile).toMatch(
          /^FROM\s+nginx:alpine$/m,
        );
      });

      it('does not use the development frontend server in the production image', () => {
        expect(webDockerfile).not.toContain(
          'pnpm --filter nevo-builder-frontend dev',
        );

        expect(webDockerfile).not.toContain(
          'vite preview',
        );
      });
    });

    describe('backend build pipeline', () => {
      it('enables Corepack in the backend build stage', () => {
        expect(
          hasInstruction(
            apiDockerfile,
            'RUN',
            'corepack enable',
          ),
        ).toBe(true);
      });

      it('uses the frozen pnpm lockfile during the backend build', () => {
        expect(apiDockerfile).toContain(
          'pnpm install --frozen-lockfile',
        );
      });

      it('builds the authentication workspace package', () => {
        expect(apiDockerfile).toContain(
          'pnpm --filter @nevo/auth build',
        );
      });

      it('builds the backend application', () => {
        expect(apiDockerfile).toContain(
          'pnpm --filter nevo-builder-backend build',
        );
      });

      it('copies the backend source into the build stage', () => {
        expect(apiDockerfile).toContain(
          'COPY apps/api apps/api',
        );
      });

      it('copies the backend workspace dependencies required for compilation', () => {
        expect(apiDockerfile).toContain(
          'COPY packages/auth packages/auth',
        );

        expect(apiDockerfile).toContain(
          'COPY packages/contracts packages/contracts',
        );

        expect(apiDockerfile).toContain(
          'COPY packages/database packages/database',
        );
      });
    });

    describe('backend runtime image', () => {
      it('copies the compiled backend application into runtime', () => {
        expect(apiDockerfile).toContain(
          'COPY --from=build /app/apps/api/dist ./dist',
        );
      });

      it('copies the backend package manifest into runtime', () => {
        expect(apiDockerfile).toContain(
          'COPY --from=production-deps /prod/api/package.json ./package.json',
        );
      });

        it('copies the isolated production dependency tree into runtime', () => {
        expect(apiDockerfile).toContain(
            'COPY --from=production-deps /prod/api/node_modules ./node_modules',
        );

        expect(apiDockerfile).toContain(
            'COPY --from=production-deps /prod/api/package.json ./package.json',
        );
        });

      it('installs only production dependencies in the runtime image', () => {
            expect(apiDockerfile).toContain(
            'RUN pnpm deploy \\',
            );

            expect(apiDockerfile).toContain(
            '--filter nevo-builder-backend \\',
            );

            expect(apiDockerfile).toContain(
            '--prod \\',
            );

            expect(apiDockerfile).toContain(
            '/prod/api',
            );
      });

      it('does not run the development backend command in the runtime image', () => {
        expect(apiDockerfile).not.toContain(
          'pnpm --filter nevo-builder-backend dev',
        );

        expect(apiDockerfile).not.toContain(
          'tsx src/index.ts',
        );
      });

      it('sets production Node environment', () => {
        expect(apiDockerfile).toContain(
          'ENV NODE_ENV=production',
        );
      });

      it('binds the backend runtime to all interfaces', () => {
        expect(apiDockerfile).toContain(
          'ENV HOST=0.0.0.0',
        );
      });

      it('defines the expected backend runtime port', () => {
        expect(apiDockerfile).toContain(
          'ENV PORT=3000',
        );

        expect(apiDockerfile).toContain(
          'EXPOSE 3000',
        );
      });

      it('uses the compiled application as the backend entrypoint', () => {
        expect(apiDockerfile).toContain(
          'CMD ["node", "dist/index.js"]',
        );
      });

      it('does not embed application secrets in the backend Dockerfile', () => {
        expect(apiDockerfile).not.toMatch(
          /ENV\s+(JWT_SECRET|DATABASE_URL|REDIS_URL|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)\s*=/i,
        );

        expect(apiDockerfile).not.toMatch(
          /(password|secret|token|api[_-]?key)\s*=\s*["']?[A-Za-z0-9_\-./+=]{8,}/i,
        );
      });
    });

    describe('frontend production image', () => {
      it('enables Corepack in the frontend build stage', () => {
        expect(
          hasInstruction(
            webDockerfile,
            'RUN',
            'corepack enable',
          ),
        ).toBe(true);
      });

      it('uses the frozen pnpm lockfile for frontend dependencies', () => {
        expect(webDockerfile).toContain(
          'pnpm install --frozen-lockfile',
        );
      });

      it('builds the shared UI package', () => {
        expect(webDockerfile).toContain(
          'pnpm --filter @nevo/ui build',
        );
      });

      it('builds the frontend application', () => {
        expect(webDockerfile).toContain(
          'pnpm --filter nevo-builder-frontend build',
        );
      });

      it('copies the compiled frontend into nginx', () => {
        expect(webDockerfile).toContain(
          'COPY --from=build /app/apps/web/dist /usr/share/nginx/html',
        );
      });

      it('uses the repository nginx configuration', () => {
        expect(webDockerfile).toContain(
          'COPY infrastructure/nginx/nevo.conf /etc/nginx/conf.d/default.conf',
        );
      });

      it('does not use the Vite development server in the frontend runtime', () => {
        expect(webDockerfile).not.toContain(
          'CMD ["pnpm"',
        );

        expect(webDockerfile).not.toContain(
          'vite',
        );
      });

      it('does not embed frontend secrets in the Dockerfile', () => {
        expect(webDockerfile).not.toMatch(
          /ENV\s+(API_KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL|REDIS_URL|JWT_SECRET)\s*=/i,
        );
      });
    });

    describe('Docker build-context protection', () => {
      it('defines a root Docker ignore file', () => {
        expect(rootDockerignore.trim()).not.toBe('');
      });

      it('excludes node_modules from the root build context', () => {
        expect(rootDockerignore).toContain(
          '**/node_modules',
        );
      });

      it('excludes build output from the root build context', () => {
        expect(rootDockerignore).toContain(
          '**/dist',
        );
      });

      it('excludes environment files from the root build context', () => {
        expect(rootDockerignore).toContain('.env');
        expect(rootDockerignore).toContain('.env.*');
        expect(rootDockerignore).toContain('!.env.example');
      });

      it('excludes git metadata from the root build context', () => {
        expect(rootDockerignore).toContain(
          '.git',
        );
      });

      it('excludes log files from the root build context', () => {
        expect(rootDockerignore).toContain(
          '*.log',
        );
      });

      it('defines an API-specific Docker ignore boundary', () => {
        expect(apiDockerignore).toContain(
          'node_modules',
        );

        expect(apiDockerignore).toContain(
          'dist',
        );


        expect(apiDockerignore).toContain('.env');
        expect(apiDockerignore).toContain('.env.*');
        expect(apiDockerignore).toContain('!.env.example');

        expect(apiDockerignore).toContain(
          '.git',
        );
      });

      it('defines a web-specific Docker ignore boundary', () => {
        expect(webDockerignore).toContain(
          'node_modules',
        );

        expect(webDockerignore).toContain(
          'dist',
        );

        expect(webDockerignore).toContain(
          '.env',
        );

        expect(webDockerignore).toContain(
          '.env.local',
        );

        expect(webDockerignore).toContain(
          '.git',
        );
      });
    });

    describe('package runtime contract', () => {
      it('defines the backend production start command', () => {
        const scripts = packageScripts(apiPackage);

        expect(scripts.start).toBe(
          'node dist/index.js',
        );
      });

      it('defines the backend production build command', () => {
        const scripts = packageScripts(apiPackage);

        expect(scripts.build).toBe('tsc');
      });

      it('does not use the backend development command as production start', () => {
        const scripts = packageScripts(apiPackage);

        expect(scripts.start).not.toContain(
          'tsx',
        );

        expect(scripts.start).not.toContain(
          'src/index',
        );
      });

      it('defines the frontend production build command', () => {
        const scripts = packageScripts(webPackage);

        expect(scripts.build).toBe(
          'tsc && vite build',
        );
      });

      it('does not define a production frontend start command using Vite', () => {
        const scripts = packageScripts(webPackage);

        if (scripts.start !== undefined) {
          expect(scripts.start).not.toContain(
            'vite',
          );
        }
      });

      it('keeps development commands separate from production build commands', () => {
        const apiScripts = packageScripts(apiPackage);
        const webScripts = packageScripts(webPackage);

        expect(apiScripts.dev).toContain(
          'tsx',
        );

        expect(webScripts.dev).toBe('vite');

        expect(apiScripts.build).not.toContain(
          'tsx',
        );

        expect(webScripts.build).not.toBe(
          webScripts.dev,
        );
      });

      it('declares a Node engine compatible with the production Node image', () => {
        const engines =
          (rootPackage.engines ?? {}) as Record<string, unknown>;

        expect(
          typeof engines.node,
        ).toBe('string');

        expect(
          String(engines.node),
        ).toContain('20');
      });
    });

    describe('production image separation', () => {
      it('does not copy the complete backend source tree into runtime', () => {
        expect(apiDockerfile).not.toContain(
          'COPY --from=build /app/apps/api ./apps/api',
        );
      });

      it('does not copy the complete frontend source tree into nginx runtime', () => {
        expect(webDockerfile).not.toContain(
          'COPY --from=build /app/apps/web ./apps/web',
        );
      });

      it('does not copy node_modules directly from the build stage', () => {
        expect(apiDockerfile).not.toContain(
          'COPY --from=build /app/node_modules',
        );

        expect(webDockerfile).not.toContain(
          'COPY --from=build /app/node_modules',
        );
      });

      it('uses a distinct backend runtime stage', () => {
        const buildIndex = apiDockerfile.indexOf(
          'FROM node:22-alpine AS build',
        );

        const runtimeIndex = apiDockerfile.indexOf(
          'FROM node:22-alpine AS runtime',
        );

        expect(buildIndex).toBeGreaterThanOrEqual(0);
        expect(runtimeIndex).toBeGreaterThan(buildIndex);
      });

      it('keeps frontend build and nginx runtime stages separate', () => {
        const buildIndex = webDockerfile.indexOf(
          'FROM node:22-alpine AS build',
        );

        const runtimeIndex = webDockerfile.indexOf(
          'FROM nginx:alpine',
        );

        expect(buildIndex).toBeGreaterThanOrEqual(0);
        expect(runtimeIndex).toBeGreaterThan(buildIndex);
      });
    });

    describe('M29.4 production container certification boundary', () => {
      it('has the required production Dockerfiles', () => {
        expect(existsSync(API_DOCKERFILE)).toBe(true);
        expect(existsSync(WEB_DOCKERFILE)).toBe(true);
      });

      it('has build-context protection for both applications', () => {
        expect(existsSync(API_DOCKERIGNORE)).toBe(true);
        expect(existsSync(WEB_DOCKERIGNORE)).toBe(true);
      });

      it('uses production runtime entrypoints rather than development servers', () => {
        expect(apiDockerfile).toContain(
          'CMD ["node", "dist/index.js"]',
        );

        expect(webDockerfile).toContain(
          'nginx:alpine',
        );

        expect(webDockerfile).not.toContain(
          'vite',
        );
      });

      it('keeps secrets outside image construction definitions', () => {
        expect(apiDockerfile).not.toMatch(
          /(JWT_SECRET|DATABASE_URL|REDIS_URL|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*[^$]/,
        );

        expect(webDockerfile).not.toMatch(
          /(JWT_SECRET|DATABASE_URL|REDIS_URL|OPENAI_API_KEY|ANTHROPIC_API_KEY)\s*=\s*[^$]/,
        );
      });

      it('maintains deterministic lockfile-based dependency installation', () => {
        expect(apiDockerfile).toContain(
          '--frozen-lockfile',
        );

        expect(webDockerfile).toContain(
          '--frozen-lockfile',
        );
      });

      it('uses production-only dependency installation for the backend runtime', () => {
        expect(apiDockerfile).toContain(
        'RUN pnpm deploy \\',
        );

        expect(apiDockerfile).toContain(
        '--filter nevo-builder-backend \\',
        );

        expect(apiDockerfile).toContain(
        '--prod \\',
        );

        expect(apiDockerfile).toContain(
        '/prod/api',
        );
      });
    });
  },
);