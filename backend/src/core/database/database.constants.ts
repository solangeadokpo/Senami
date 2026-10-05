import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from '@database/schema/index.js';

/** Typed Drizzle client. Injected only into `*.repository.drizzle.ts` files. */
export const DRIZZLE = Symbol('DRIZZLE');
export const PG_POOL = Symbol('PG_POOL');

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
