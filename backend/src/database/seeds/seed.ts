import { Pool } from 'pg';
import {
  logSettings,
  validateScriptEnvironment,
} from '@config/env.validation.js';
import { createDatabase } from '@core/database/create-database.js';
import { createStandaloneLogger } from '@core/logging/standalone-logger.js';
import { SystemClock } from '@core/time/system-clock.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';
import {
  assertLevelAllowed,
  parseSeedLevel,
  runSeeders,
  seedersFor,
} from './seed-runner.js';

// Entry point: `seed.js bootstrap | demo | all` (default: all).
const environment = validateScriptEnvironment(process.env);
const logger = createStandaloneLogger('seed', logSettings(environment));
const pool = new Pool({ connectionString: environment.DATABASE_URL });

try {
  const level = parseSeedLevel(process.argv[2]);
  assertLevelAllowed(level, environment.NODE_ENV);
  await runSeeders(seedersFor(level, process.env), {
    db: createDatabase(pool),
    logger,
    clock: new SystemClock(),
    passwords: new PasswordHasherService(),
  });
  logger.info({ seedLevel: level }, 'Seeding done');
} catch (error: unknown) {
  // A script has no exception filter: report, and fail the process.
  logger.error({ err: error }, 'Seeding failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
