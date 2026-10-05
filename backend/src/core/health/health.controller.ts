import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../database/index.js';

const DATABASE_TIMEOUT_MS = 1_500;

/**
 * `live`: restart the process if it fails. `ready`: take it out of the load
 * balancer. Conflating them turns a database outage into a restart loop.
 */
@ApiExcludeController()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    const ping = this.db.execute(sql`SELECT 1`).then(() => true);
    const timeout = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), DATABASE_TIMEOUT_MS).unref(),
    );

    const reachable = await Promise.race([ping, timeout]).catch(() => false);
    if (!reachable) {
      throw new ServiceUnavailableException({ database: 'down' });
    }

    return { status: 'ok' };
  }
}
