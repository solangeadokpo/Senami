import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  check,
  index,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  bytea,
  citext,
  createdAt,
  id,
  timestamptz,
  updatedAt,
} from './columns.js';
import { sessionChannel, userRole, userStatus } from './enums.js';
import { establishments } from './establishments.js';

export const users = pgTable(
  'users',
  {
    id: id(),
    // NULL for the super administrator, set for every other role.
    establishmentId: uuid().references(() => establishments.id),
    role: userRole().notNull(),
    email: citext().notNull(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    jobTitle: text(),
    // NULL until the invitation is accepted.
    passwordHash: text(),
    status: userStatus().notNull().default('invited'),
    // Encrypted by the application; TOTP is mandatory for responsable and super admin.
    totpSecretEncrypted: bytea(),
    totpEnrolledAt: timestamptz(),
    totpFailedAttempts: smallint().notNull().default(0),
    totpLockedUntil: timestamptz(),
    lastLoginAt: timestamptz(),
    deactivatedAt: timestamptz(),
    createdBy: uuid().references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('users_email_uq').on(t.email),
    index('users_establishment_idx').on(t.establishmentId, t.role),
    check(
      'users_role_scope_check',
      sql`(role = 'super_admin') = (establishment_id IS NULL)`,
    ),
    check(
      'users_active_password_check',
      sql`status <> 'active' OR password_hash IS NOT NULL`,
    ),
    check(
      'users_deactivated_check',
      sql`status <> 'deactivated' OR deactivated_at IS NOT NULL`,
    ),
  ],
);

/** A resend revokes the pending invitation and creates a new row. */
export const userInvitations = pgTable(
  'user_invitations',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: bytea().notNull().unique(),
    invitedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamptz().notNull(),
    acceptedAt: timestamptz(),
    revokedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('user_invitations_one_pending_uq')
      .on(t.userId)
      .where(sql`accepted_at IS NULL AND revoked_at IS NULL`),
  ],
);

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: id(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: bytea().notNull().unique(),
  expiresAt: timestamptz().notNull(),
  usedAt: timestamptz(),
  createdAt: createdAt(),
});

/** Long mobile sessions (MOB-03) and back office sessions, revocable. */
export const authSessions = pgTable(
  'auth_sessions',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: sessionChannel().notNull(),
    // Rotated on every use.
    refreshTokenHash: bytea().notNull().unique(),
    deviceId: text(),
    deviceName: text(),
    platform: text(),
    appVersion: text(),
    createdAt: createdAt(),
    lastUsedAt: timestamptz().notNull().defaultNow(),
    expiresAt: timestamptz().notNull(),
    revokedAt: timestamptz(),
    revokedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    revocationReason: text(),
  },
  (t) => [
    index('auth_sessions_active_idx')
      .on(t.userId)
      .where(sql`revoked_at IS NULL`),
    check(
      'auth_sessions_platform_check',
      sql`platform IN ('ios', 'android', 'web')`,
    ),
  ],
);

/** 2FA-03: ten single-use recovery codes. */
export const totpRecoveryCodes = pgTable(
  'totp_recovery_codes',
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text().notNull(),
    usedAt: timestamptz(),
    createdAt: createdAt(),
  },
  (t) => [
    index('totp_recovery_codes_user_idx')
      .on(t.userId)
      .where(sql`used_at IS NULL`),
  ],
);
