import { expect, test } from '@playwright/test';

const SITE_URL = 'http://localhost:3101';
const APP_URL = 'http://app.localhost:3101';

test('serves the showcase site, indexable', async ({ page }) => {
  const response = await page.goto(SITE_URL);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Senami');
  expect(response?.headers()['x-robots-tag']).toBeUndefined();
});

test('serves the back office on its host, not indexable', async ({ page }) => {
  const response = await page.goto(APP_URL);

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Espace d’administration',
  );
  expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test('hides the back office from the site host', async ({ page }) => {
  const response = await page.goto(`${SITE_URL}/admin`);

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Page introuvable',
  );
});

test('sends the security headers', async ({ request }) => {
  const response = await request.get(SITE_URL);
  const headers = response.headers();

  expect(headers['content-security-policy']).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-powered-by']).toBeUndefined();
});
