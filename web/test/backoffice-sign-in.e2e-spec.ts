import { expect, test } from '@playwright/test';

const APP_URL = 'http://app.localhost:3101';

// Without the API: what the sign-in page does before the first call. The
// journey with the API is checked by hand (docs/features/auth).

test('sends a visitor without session to the sign-in page', async ({
  page,
}) => {
  await page.goto(`${APP_URL}/`);

  await expect(page).toHaveURL(`${APP_URL}/connexion`);
  await expect(page.getByRole('img', { name: 'Sènami' })).toBeVisible();
});

test('asks for both fields before calling the API', async ({ page }) => {
  await page.goto(`${APP_URL}/connexion`);

  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByText('Saisissez votre adresse e-mail.')).toBeVisible();
  await expect(page.getByText('Saisissez votre mot de passe.')).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});

test('checks the email address when leaving the field', async ({ page }) => {
  await page.goto(`${APP_URL}/connexion`);

  await page.getByLabel('Adresse e-mail').fill('lea.ecole.fr');
  await page.getByLabel('Mot de passe', { exact: true }).focus();

  await expect(
    page.getByText(
      'Saisissez une adresse e-mail valide, par exemple nom@ecole.fr.',
    ),
  ).toBeVisible();
});

test('shows and hides the password', async ({ page }) => {
  await page.goto(`${APP_URL}/connexion`);
  const password = page.getByLabel('Mot de passe', { exact: true });

  await password.fill('secret');
  await page.getByRole('button', { name: 'Afficher le mot de passe' }).click();

  await expect(password).toHaveAttribute('type', 'text');
});
