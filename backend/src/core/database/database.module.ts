import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Pool } from 'pg';
import { databaseConfig } from '@config/index.js';
import { UNIT_OF_WORK } from '@shared/interfaces/unit-of-work.interface.js';
import { createDatabase } from './create-database.js';
import { DrizzleUnitOfWork } from './drizzle-unit-of-work.js';
import { DRIZZLE, PG_POOL } from './database.constants.js';

/** Global on purpose: every repository needs the client, nothing else does. */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) =>
        new Pool({ connectionString: config.url }),
    },
    {
      provide: DRIZZLE,
      inject: [PG_POOL],
      useFactory: (pool: Pool) => createDatabase(pool),
    },
    { provide: UNIT_OF_WORK, useClass: DrizzleUnitOfWork },
  ],
  exports: [DRIZZLE, UNIT_OF_WORK],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}
