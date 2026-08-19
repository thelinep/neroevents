import {
  test as base,
  expect,
  type Page,
} from '@playwright/test';

type TestData = {
  email: string;
  password: string;
  displayName: string;
  projectName: string;
  agentName: string;
};

type Fixtures = {
  testData: TestData;
};

export const test = base.extend<Fixtures>({
  testData: async ({}, use) => {
    const unique = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    await use({
      email: `e2e-${unique}@test.com`,
      password: 'Password123!',
      displayName: 'Playwright Tester',
      projectName: `E2E Project ${unique}`,
      agentName: `E2E Agent ${unique}`,
    });
  },
});

export { expect };

export async function register(
  page: Page,
  data: TestData,
) {
  await page.goto('/register');

  await page.getByPlaceholder('Email').fill(data.email);
  await page.getByPlaceholder('Password').fill(data.password);
  await page.getByPlaceholder('Display name').fill(data.displayName);

  await page.getByRole('button', {
    name: /register|sign up|create account/i,
  }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function login(
  page: Page,
  data: TestData,
) {
  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(data.email);
  await page.getByPlaceholder('Password').fill(data.password);

  await page.getByRole('button', {
    name: /login|sign in/i,
  }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}