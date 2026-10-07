import { sql } from 'drizzle-orm';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
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
  sqlValue,
  sqlValues,
} from './columns.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
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
    status: userStatus().notNull().default(UserStatus.INVITED),
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
      sql`(role = ${sqlValue(UserRole.SUPER_ADMIN)}) = (establishment_id IS NULL)`,
    ),
    check(
      'users_active_password_check',
      sql`status <> ${sqlValue(UserStatus.ACTIVE)} OR password_hash IS NOT NULL`,
    ),
    check(
      'users_deactivated_check',
      sql`status <> ${sqlValue(UserStatus.DEACTIVATED)} OR deactivated_at IS NOT NULL`,
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
    // Rotated on every use. The previous hash detects a replayed token.
    refreshTokenHash: bytea().notNull().unique(),
    previousRefreshTokenHash: bytea(),
    deviceId: text(),
    deviceName: text(),
    platform: text().$type<DevicePlatform>(),
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
    index('auth_sessions_previous_token_idx').on(t.previousRefreshTokenHash),
    check(
      'auth_sessions_platform_check',
      sql`platform IN (${sqlValues(Object.values(DevicePlatform))})`,
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
