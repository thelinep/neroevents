import { test, expect, register } from './fixtures';

test.describe('M23 Project UX & Reliability', () => {
  test('creates, opens, reloads, and returns to a project', async ({
    page,
    testData,
  }) => {
    // Auth
    await register(page, testData);

        page.on('console', msg => {
  console.log(`[browser:${msg.type()}] ${msg.text()}`);
});

page.on('request', request => {
  if (request.url().includes('/api/projects')) {
    console.log('PROJECT REQUEST:', request.method(), request.url());
  }
});

page.on('response', response => {
  if (response.url().includes('/api/projects')) {
    console.log(
      'PROJECT RESPONSE:',
      response.status(),
      response.url(),
    );
  }
});

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

      console.log(
  await page.locator('#nevo-portal-root').evaluate((root) => ({
    rect: root.getBoundingClientRect().toJSON(),
    position: getComputedStyle(root).position,
    width: getComputedStyle(root).width,
    height: getComputedStyle(root).height,
    pointerEvents: getComputedStyle(root).pointerEvents,
  })),
);

const createButton = page.getByRole('button', {
  name: 'Create',
  exact: true,
});

await expect(createButton).toBeVisible();
await expect(createButton).toBeEnabled();

await createButton.click();

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
