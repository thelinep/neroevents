import { test, expect } from '@playwright/test';

test('existing E2E user can log in and access the dashboard', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/login');

  await expect(page.locator('input[placeholder="Email"]')).toBeVisible();
  await page.fill('input[placeholder="Email"]', process.env.E2E_EMAIL || 'e2e@test.com');
  await page.fill('input[type="password"]', process.env.E2E_PASSWORD || 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Welcome back')).toBeVisible();
});
