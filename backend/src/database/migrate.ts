import {
  logSettings,
  validateScriptEnvironment,
} from '@config/env.validation.js';
import { createStandaloneLogger } from '@core/logging/standalone-logger.js';
import { runMigrations } from './run-migrations.js';

// Production entry point: drizzle-kit is a dev dependency and is not in the
// image. Run before the API starts (compose `migrate` service, release step).
const environment = validateScriptEnvironment(process.env);
const logger = createStandaloneLogger('migrate', logSettings(environment));

await runMigrations(environment.DATABASE_URL);
logger.info('Migrations applied');
