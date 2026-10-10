import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database, executorOf } from '@core/database/index.js';
import { auditLogs } from '@database/schema/index.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type { AuditRepository, AuditRow } from './audit.repository.js';

@Injectable()
export class DrizzleAuditRepository implements AuditRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async insert(row: AuditRow, scope?: TransactionScope): Promise<void> {
    await executorOf(this.db, scope).insert(auditLogs).values(row);
  }
}
