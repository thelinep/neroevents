import { test as base, expect, type Page } from '@playwright/test';

type AuthFixture = {
  authenticatedPage: Page;
  testEmail: string;
  testPassword: string;
};

const password = 'NevoE2E!Password123';

export const test = base.extend<AuthFixture>({
  testEmail: async ({}, use) => {
    const email = `e2e-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@test.local`;

    await use(email);
  },

  testPassword: async ({}, use) => {
    await use(password);
  },

  authenticatedPage: async (
    { page, testEmail, testPassword },
    use,
  ) => {
    await page.goto('/register');

    await expect(
      page.getByRole('heading', {
        name: 'Create your Nevo account',
      }),
    ).toBeVisible();

    await page.getByPlaceholder('Display name').fill('Playwright E2E');

    await page.getByPlaceholder('Email').fill(testEmail);

    await page.getByPlaceholder('Password').fill(testPassword);

    await page.getByRole('button', {
      name: 'Create account',
    }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();

    await use(page);
  },
});

export { expect };