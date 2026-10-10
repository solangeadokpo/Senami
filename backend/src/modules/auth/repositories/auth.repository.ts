import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import type { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import type { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import type { UserStatus } from '@shared/enums/user-status.enum.js';
import type { SessionChannel } from '@shared/enums/session-channel.enum.js';
import type { UserRole } from '@shared/enums/user-role.enum.js';

/** A user with what decides whether they may sign in. */
export interface Account {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  establishment: {
    id: string;
    name: string;
    status: EstablishmentStatus;
  } | null;
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null;
}

export interface StoredSession {
  id: string;
  userId: string;
  channel: SessionChannel;
  deviceId: string | null;
  deviceName: string | null;
  platform: DevicePlatform | null;
  appVersion: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface NewSession {
  userId: string;
  channel: SessionChannel;
  refreshTokenHash: Buffer;
  deviceId: string | null;
  deviceName: string | null;
  platform: DevicePlatform;
  appVersion: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface Revocation {
  at: Date;
  /** null when the system revokes (replayed token). */
  by: string | null;
  reason: string;
}

export type SessionLookup =
  { sessionId: string } | { refreshTokenHash: Buffer };

export interface AuthRepository {
  findAccountByEmail(
    email: string,
  ): Promise<(Account & { passwordHash: string | null }) | undefined>;
  findAccountById(userId: string): Promise<Account | undefined>;
  /** Session and account in one query: run on every authenticated request. */
  findSessionWithAccount(
    lookup: SessionLookup,
  ): Promise<{ session: StoredSession; account: Account } | undefined>;
  findSessionById(sessionId: string): Promise<StoredSession | undefined>;
  findSessionByRefreshHash(hash: Buffer): Promise<StoredSession | undefined>;
  findSessionByPreviousRefreshHash(
    hash: Buffer,
  ): Promise<StoredSession | undefined>;
  createSession(
    session: NewSession,
    scope?: TransactionScope,
  ): Promise<StoredSession>;
  /** Compare-and-swap on the current hash: false if it already changed. */
  rotateRefreshToken(rotation: {
    sessionId: string;
    currentHash: Buffer;
    nextHash: Buffer;
    expiresAt: Date;
    usedAt: Date;
  }): Promise<boolean>;
  revokeSession(sessionId: string, revocation: Revocation): Promise<void>;
  /** Revokes the active sessions of a user, optionally of one device or channel. */
  revokeUserSessions(
    userId: string,
    revocation: Revocation,
    filter?: { deviceId?: string; channel?: SessionChannel },
    scope?: TransactionScope,
  ): Promise<number>;
  /** Not revoked and not expired, most recently used first. */
  listActiveSessions(userId: string, now: Date): Promise<StoredSession[]>;
  recordLogin(
    userId: string,
    at: Date,
    scope?: TransactionScope,
  ): Promise<void>;
}

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');
