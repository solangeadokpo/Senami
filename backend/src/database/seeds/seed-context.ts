import type { Logger } from 'pino';
import type { Database } from '@core/database/index.js';
import type { Clock } from '@shared/interfaces/clock.interface.js';
import type { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';

export interface SeedContext {
  db: Database;
  logger: Logger;
  clock: Clock;
  passwords: PasswordHasherService;
}

/** Creates what is missing, never changes what exists. */
export interface Seeder {
  readonly name: string;
  run(context: SeedContext): Promise<void>;
}
