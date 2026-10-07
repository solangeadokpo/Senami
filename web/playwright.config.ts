import { defineConfig, devices } from '@playwright/test';

const PORT = 3101;

// The production build, on its own port, with test URLs.
export default defineConfig({
  testDir: './test',
  testMatch: '*.e2e-spec.ts',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? 'list' : 'github',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `next build && exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: process.env.CI === undefined,
    timeout: 180_000,
    env: {
      API_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      NEXT_PUBLIC_APP_URL: `http://app.localhost:${PORT}`,
    },
  },
});
