import { expect, test } from '@playwright/test';

const APP_URL = 'http://app.localhost:3101';

// Without the API: a link without token, or a malformed one, is refused
// before any call. The journey with the API is checked by hand
// (docs/features/auth/invitation-acceptance.md).

test('opens the invitation page without a session', async ({ page }) => {
  const response = await page.goto(`${APP_URL}/invitation`);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(`${APP_URL}/invitation`);
});

test('refuses a link without token', async ({ page }) => {
  await page.goto(`${APP_URL}/invitation`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Ce lien ne permet pas d’activer un compte',
  );
  await expect(page.getByRole('link', { name: 'Se connecter' })).toBeVisible();
});

test('removes the token from the address bar at once', async ({ page }) => {
  await page.goto(`${APP_URL}/invitation#pas-un-jeton`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Ce lien ne permet pas d’activer un compte',
  );
  expect(new URL(page.url()).hash).toBe('');
});

test('reads a link opened again in the same tab', async ({ page }) => {
  await page.goto(`${APP_URL}/invitation`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Same page, new #: the browser does not reload it.
  await page.evaluate(() => {
    window.location.hash = 'encore-un-lien';
  });

  await expect.poll(() => new URL(page.url()).hash).toBe('');
});

test('keeps the establishment pages behind the sign-in', async ({ page }) => {
  await page.goto(`${APP_URL}/etablissements`);

  await expect(page).toHaveURL(`${APP_URL}/connexion`);
});
