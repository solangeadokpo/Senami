import {
  bigint,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamptz } from './columns.js';
import { userRole } from './enums.js';

/**
 * NF-02, 2FA-04: administration audit trail, append-only (trigger). Never
 * holds sheet content. No foreign keys: the history outlives deletions.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    occurredAt: timestamptz().notNull().defaultNow(),
    actorUserId: uuid(),
    // NULL for the system (webhook, scheduled job).
    actorRole: userRole(),
    establishmentId: uuid(),
    // e.g. 'user.invited', 'session.revoked', 'totp.reset'
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    details: jsonb().notNull().default({}),
    ipAddress: inet(),
    userAgent: text(),
  },
  (t) => [
    index('audit_logs_establishment_idx').on(
      t.establishmentId,
      t.occurredAt.desc(),
    ),
    index('audit_logs_actor_idx').on(t.actorUserId, t.occurredAt.desc()),
    index('audit_logs_action_idx').on(t.action, t.occurredAt.desc()),
  ],
);
