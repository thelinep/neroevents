import { test, expect, register } from './fixtures';

test.describe('M21 Auth → Project → Agent', () => {
  test('registers, creates a project, then creates an agent', async ({
    page,
    testData,
  }) => {
    // Auth
    await register(page, testData);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' }))
      .toBeVisible();

    // Project
    // Project
    await page.getByRole('button', { name: /new project/i }).click();

    await page
      .getByPlaceholder('Project name')
      .fill(testData.projectName);

    await page.getByRole('button', { name: /^Create$/ }).click();

  

    await expect(
      page.getByText(testData.projectName, { exact: true }),
    ).toBeVisible({ timeout: 10000 });

    // Agent management
    await page.getByRole('link', {
      name: /agents/i,
    }).click();

    await expect(
      page.getByRole('heading', {
        name: 'Custom Agents',
      }),
    ).toBeVisible();

    await page.getByRole('button', {
      name: 'Create Agent',
    }).click();

    await page
  .getByRole('textbox', { name: 'Name', exact: true })
  .fill(testData.agentName);

    await page
      .getByPlaceholder('Description')
      .fill('Playwright E2E agent');

    await page
      .getByPlaceholder('System prompt')
      .fill('You are a helpful E2E test agent.');

    await page
      .getByPlaceholder('Model name')
      .fill('gpt-4o-mini');

    await page.getByRole('button', {
      name: 'Save',
      exact: true,
    }).click();

    await expect(
      page.getByText(testData.agentName),
    ).toBeVisible();
  });
});