import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '@database/schema/index.js';
import type { Database } from './database.constants.js';

/** The one way to build the client: the API and the scripts share it. */
export function createDatabase(pool: Pool): Database {
  // casing must match drizzle.config.ts.
  return drizzle({ client: pool, schema, casing: 'snake_case' });
}
