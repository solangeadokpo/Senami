import { Inject, Injectable } from '@nestjs/common';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type * as schema from '@database/schema/index.js';
import type {
  TransactionScope,
  UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';
import {
  DRIZZLE,
  type Database,
  type Transaction,
} from './database.constants.js';

/** The database or a transaction: what a repository query runs on. */
export type Executor = PgDatabase<NodePgQueryResultHKT, typeof schema>;

export class DrizzleTransactionScope implements TransactionScope {
  readonly kind = 'transaction-scope';
  constructor(readonly tx: Transaction) {}
}

@Injectable()
export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(new DrizzleTransactionScope(tx)));
  }
}

/** The transaction of the scope when there is one, else the database. */
export function executorOf(db: Database, scope?: TransactionScope): Executor {
  return scope instanceof DrizzleTransactionScope ? scope.tx : db;
}
