import { config } from 'dotenv';
import { runMigrations } from '@database/run-migrations.js';

/** Brings the test database to the latest migration before the suites run. */
export default async function setup(): Promise<void> {
  const url = config({ path: '.env.test', quiet: true }).parsed?.[
    'DATABASE_URL'
  ];
  if (url === undefined) {
    throw new Error('DATABASE_URL is missing from .env.test');
  }

  await runMigrations(url);
}
