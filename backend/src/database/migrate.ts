import { Logger } from '@nestjs/common';
import { env } from '@config/env.validation.js';
import { runMigrations } from './run-migrations.js';

// Production entry point: drizzle-kit is a dev dependency and is not in the
// image. Run before the API starts (compose `migrate` service, release step).
const logger = new Logger('Migrate');

await runMigrations(env().DATABASE_URL);
logger.log('Migrations applied');
