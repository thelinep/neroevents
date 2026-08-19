import { test, expect, register, login } from './fixtures';

test.describe('M23 Auth / Session Reliability', () => {
  test('registers and lands on dashboard', async ({
    page,
    testData,
  }) => {
    await register(page, testData);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('logs in with valid credentials', async ({
    page,
    testData,
  }) => {
    await register(page, testData);

    await page.getByRole('button', {
      name: /logout/i,
    }).click();

    await expect(page).toHaveURL(/\/login$/);

    await login(page, testData);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('restores the session after browser refresh', async ({
    page,
    testData,
  }) => {
    await register(page, testData);

    await expect(page).toHaveURL(/\/dashboard$/);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
    await expect(
      page.getByText(testData.displayName, { exact: true }),
    ).toBeVisible();
  });

  test('rejects invalid credentials', async ({
    page,
    testData,
  }) => {
    await register(page, testData);

    await page.getByRole('button', {
      name: /logout/i,
    }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel(/email/i).fill(testData.email);
    await page.getByLabel(/password/i).fill('WrongPassword123!');

    await page.getByRole('button', {
      name: /login|sign in/i,
    }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('redirects unauthenticated users from protected routes', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
  });
});