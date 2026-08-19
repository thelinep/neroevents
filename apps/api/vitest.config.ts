import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // API integration tests share the same PostgreSQL test database.
    // Run test files sequentially to prevent concurrent TRUNCATE/deadlocks.
    fileParallelism: false,

    coverage: {
      provider: 'v8',
    },

    setupFiles: ['./tests/setup.ts'],
  },
});