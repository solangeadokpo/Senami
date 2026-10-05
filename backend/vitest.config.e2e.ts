import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// The e2e suite runs against its own database, never the development one.
const testEnv = config({ path: '.env.test', quiet: true }).parsed ?? {};

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // The suites share one database.
    fileParallelism: false,
    hookTimeout: 30_000,
    env: testEnv,
  },
});
