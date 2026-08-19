import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: false,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: 1,

  reporter: 'html',

  use: {
    baseURL,

    trace: 'on-first-retry',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    // Keep browser navigation deterministic in CI.
    ignoreHTTPSErrors: false,
  },

  projects: [
    {
      name: 'chromium',

      use: {
        ...devices['Desktop Chrome'],
      },
    },

    {
      name: 'firefox',

      use: {
        ...devices['Desktop Firefox'],
      },
    },

    {
      name: 'webkit',

      use: {
        ...devices['Desktop Safari'],
      },
    },
  ],
});
