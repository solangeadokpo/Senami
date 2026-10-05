import { sql } from 'drizzle-orm';
import type { Database, Transaction } from './database.constants.js';

/**
 * Runs `work` in a transaction scoped to one establishment. Mandatory for the
 * tables under row level security (students, useful_contacts,
 * sheet_recipients, declaration_submissions, payments): outside it they read
 * as empty and reject writes.
 */
export function withTenant<T>(
  db: Database,
  establishmentId: string,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config(..., true) is SET LOCAL, with a bind parameter.
    await tx.execute(
      sql`SELECT set_config('app.establishment_id', ${establishmentId}, true)`,
    );
    return work(tx);
  });
}

/** Cross-establishment access: super administrator and system jobs only. */
export function asSuperAdmin<T>(
  db: Database,
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.is_super_admin', 'on', true)`);
    return work(tx);
  });
}
