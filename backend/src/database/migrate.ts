import { env } from '@config/env.validation.js';
import { createStandaloneLogger } from '@core/logging/standalone-logger.js';
import { runMigrations } from './run-migrations.js';

// Production entry point: drizzle-kit is a dev dependency and is not in the
// image. Run before the API starts (compose `migrate` service, release step).
const logger = createStandaloneLogger('migrate');

await runMigrations(env().DATABASE_URL);
logger.info('Migrations applied');
