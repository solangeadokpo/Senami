import { Inject, Injectable } from '@nestjs/common';
import type { AuditAction } from '@shared/enums/audit-action.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import {
  AUDIT_REPOSITORY,
  type AuditRepository,
} from '@modules/audit/repositories/audit.repository.js';

export interface AuditEntry {
  action: AuditAction;
  /** null for the system. */
  actor: Pick<AuthenticatedUser, 'userId' | 'role'> | null;
  target?: { type: string; id: string };
  establishmentId?: string | null;
  /** Identifiers and reasons only: never a secret, a code or sheet content. */
  details?: Record<string, unknown>;
  client?: ClientDetails;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(AUDIT_REPOSITORY) private readonly repository: AuditRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Pass the scope of the audited action, so both commit or neither does. */
  record(entry: AuditEntry, scope?: TransactionScope): Promise<void> {
    return this.repository.insert(
      {
        action: entry.action,
        actorUserId: entry.actor?.userId ?? null,
        actorRole: entry.actor?.role ?? null,
        establishmentId: entry.establishmentId ?? null,
        targetType: entry.target?.type ?? null,
        targetId: entry.target?.id ?? null,
        details: entry.details ?? {},
        ipAddress: entry.client?.ipAddress ?? null,
        userAgent: entry.client?.userAgent ?? null,
        occurredAt: this.clock.now(),
      },
      scope,
    );
  }
}
