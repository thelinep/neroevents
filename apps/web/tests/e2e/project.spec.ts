import { test, expect, register } from './fixtures';

test.describe('M23 Project UX & Reliability', () => {
  test('creates, opens, reloads, and returns to a project', async ({
    page,
    testData,
  }) => {
    // Auth
    await register(page, testData);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();

    // Create project
    await page.getByRole('button', {
      name: /new project/i,
    }).click();

    await page.getByPlaceholder('Project name')
      .fill(testData.projectName);

    await page.getByRole('button', {
      name: 'Create',
      exact: true,
    }).click();

    // Project route
    await expect(page).toHaveURL(/\/project\/[^/]+$/);

    await expect(
      page.getByRole('heading', {
        name: testData.projectName,
      }),
    ).toBeVisible();

    // Project content should render
    await expect(
      page.getByText(/recent history/i),
    ).toBeVisible();

    // Reload / deep-link reliability
    await page.reload();

    await expect(page).toHaveURL(/\/project\/[^/]+$/);

    await expect(
      page.getByRole('heading', {
        name: testData.projectName,
      }),
    ).toBeVisible({
      timeout: 10000,
    });

    // Return to dashboard
    await page.getByRole('link', {
      name: /dashboard/i,
    }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect(
      page.getByText(testData.projectName, { exact: true }),
    ).toBeVisible();
  });
});
