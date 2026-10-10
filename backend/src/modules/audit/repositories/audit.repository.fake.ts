import type { AuditRepository, AuditRow } from './audit.repository.js';

export class FakeAuditRepository implements AuditRepository {
  readonly rows: AuditRow[] = [];

  insert(row: AuditRow): Promise<void> {
    this.rows.push(row);
    return Promise.resolve();
  }
}
