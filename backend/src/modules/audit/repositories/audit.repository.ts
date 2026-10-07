import type { AuditAction } from '@shared/enums/audit-action.enum.js';
import type { UserRole } from '@shared/enums/user-role.enum.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';

export interface AuditRow {
  action: AuditAction;
  actorUserId: string | null;
  actorRole: UserRole | null;
  establishmentId: string | null;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  occurredAt: Date;
}

export interface AuditRepository {
  insert(row: AuditRow, scope?: TransactionScope): Promise<void>;
}

export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');
