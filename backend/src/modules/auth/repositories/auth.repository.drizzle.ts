import type { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { Inject, Injectable } from '@nestjs/common';
import { type SQL, and, desc, eq, gt, isNull, ne } from 'drizzle-orm';
import { DRIZZLE, type Database } from '@core/database/index.js';
import {
  authSessions,
  establishments,
  subscriptions,
  users,
} from '@database/schema/index.js';
import type {
  Account,
  AuthRepository,
  NewSession,
  Revocation,
  SessionLookup,
  StoredSession,
} from './auth.repository.js';

// users, establishments, subscriptions and auth_sessions are not under row
// level security: authentication runs before any tenant is known.

const accountColumns = {
  userId: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  status: users.status,
  establishmentId: establishments.id,
  establishmentName: establishments.name,
  establishmentStatus: establishments.status,
  subscriptionStatus: subscriptions.status,
  currentPeriodEnd: subscriptions.currentPeriodEnd,
};

const sessionColumns = {
  id: authSessions.id,
  userId: authSessions.userId,
  channel: authSessions.channel,
  deviceId: authSessions.deviceId,
  deviceName: authSessions.deviceName,
  platform: authSessions.platform,
  appVersion: authSessions.appVersion,
  createdAt: authSessions.createdAt,
  lastUsedAt: authSessions.lastUsedAt,
  expiresAt: authSessions.expiresAt,
  revokedAt: authSessions.revokedAt,
};

interface AccountRow {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Account['role'];
  status: Account['status'];
  establishmentId: string | null;
  establishmentName: string | null;
  establishmentStatus: EstablishmentStatus | null;
  subscriptionStatus: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
}

@Injectable()
export class DrizzleAuthRepository implements AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAccountByEmail(
    email: string,
  ): Promise<(Account & { passwordHash: string | null }) | undefined> {
    const [row] = await this.selectAccount(eq(users.email, email));
    return row === undefined
      ? undefined
      : { ...toAccount(row), passwordHash: row.passwordHash };
  }

  async findAccountById(userId: string): Promise<Account | undefined> {
    const [row] = await this.selectAccount(eq(users.id, userId));
    return row === undefined ? undefined : toAccount(row);
  }

  async findSessionWithAccount(
    lookup: SessionLookup,
  ): Promise<{ session: StoredSession; account: Account } | undefined> {
    const [row] = await this.db
      .select({ ...accountColumns, session: sessionColumns })
      .from(authSessions)
      .innerJoin(users, eq(users.id, authSessions.userId))
      .leftJoin(establishments, eq(establishments.id, users.establishmentId))
      .leftJoin(subscriptions, currentSubscriptionOfUser())
      .where(
        'sessionId' in lookup
          ? eq(authSessions.id, lookup.sessionId)
          : eq(authSessions.refreshTokenHash, lookup.refreshTokenHash),
      )
      .limit(1);
    return row === undefined
      ? undefined
      : { session: row.session, account: toAccount(row) };
  }

  async findSessionById(sessionId: string): Promise<StoredSession | undefined> {
    return this.findSession(eq(authSessions.id, sessionId));
  }

  async findSessionByRefreshHash(
    hash: Buffer,
  ): Promise<StoredSession | undefined> {
    return this.findSession(eq(authSessions.refreshTokenHash, hash));
  }

  async findSessionByPreviousRefreshHash(
    hash: Buffer,
  ): Promise<StoredSession | undefined> {
    return this.findSession(eq(authSessions.previousRefreshTokenHash, hash));
  }

  async createSession(session: NewSession): Promise<StoredSession> {
    const [created] = await this.db
      .insert(authSessions)
      .values({ ...session, lastUsedAt: session.createdAt })
      .returning(sessionColumns);
    if (created === undefined) {
      throw new Error('Session insert returned no row');
    }
    return created;
  }

  async rotateRefreshToken(rotation: {
    sessionId: string;
    currentHash: Buffer;
    nextHash: Buffer;
    expiresAt: Date;
    usedAt: Date;
  }): Promise<boolean> {
    const updated = await this.db
      .update(authSessions)
      .set({
        refreshTokenHash: rotation.nextHash,
        previousRefreshTokenHash: rotation.currentHash,
        expiresAt: rotation.expiresAt,
        lastUsedAt: rotation.usedAt,
      })
      .where(
        and(
          eq(authSessions.id, rotation.sessionId),
          eq(authSessions.refreshTokenHash, rotation.currentHash),
          isNull(authSessions.revokedAt),
        ),
      )
      .returning({ id: authSessions.id });
    return updated.length > 0;
  }

  async revokeSession(
    sessionId: string,
    revocation: Revocation,
  ): Promise<void> {
    await this.db
      .update(authSessions)
      .set(revocationValues(revocation))
      .where(
        and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)),
      );
  }

  async revokeUserSessions(
    userId: string,
    revocation: Revocation,
    deviceId?: string,
  ): Promise<number> {
    const revoked = await this.db
      .update(authSessions)
      .set(revocationValues(revocation))
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          deviceId === undefined
            ? undefined
            : and(
                eq(authSessions.deviceId, deviceId),
                eq(authSessions.channel, SessionChannel.MOBILE),
              ),
        ),
      )
      .returning({ id: authSessions.id });
    return revoked.length;
  }

  async listActiveSessions(
    userId: string,
    now: Date,
  ): Promise<StoredSession[]> {
    return this.db
      .select(sessionColumns)
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, userId),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .orderBy(desc(authSessions.lastUsedAt));
  }

  async recordLogin(userId: string, at: Date): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: at })
      .where(eq(users.id, userId));
  }

  private selectAccount(condition: SQL) {
    return this.db
      .select({ ...accountColumns, passwordHash: users.passwordHash })
      .from(users)
      .leftJoin(establishments, eq(establishments.id, users.establishmentId))
      .leftJoin(subscriptions, currentSubscriptionOfUser())
      .where(condition)
      .limit(1);
  }

  private async findSession(
    condition: SQL,
  ): Promise<StoredSession | undefined> {
    const [row] = await this.db
      .select(sessionColumns)
      .from(authSessions)
      .where(condition)
      .limit(1);
    return row;
  }
}

// At most one non-cancelled subscription per establishment (unique index).
function currentSubscriptionOfUser() {
  return and(
    eq(subscriptions.establishmentId, users.establishmentId),
    ne(subscriptions.status, SubscriptionStatus.CANCELLED),
  );
}

function revocationValues(revocation: Revocation) {
  return {
    revokedAt: revocation.at,
    revokedBy: revocation.by,
    revocationReason: revocation.reason,
  };
}

function toAccount(row: AccountRow): Account {
  return {
    userId: row.userId,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    status: row.status,
    establishment:
      row.establishmentId === null ||
      row.establishmentName === null ||
      row.establishmentStatus === null
        ? null
        : {
            id: row.establishmentId,
            name: row.establishmentName,
            status: row.establishmentStatus,
          },
    subscription:
      row.subscriptionStatus === null
        ? null
        : {
            status: row.subscriptionStatus,
            currentPeriodEnd: row.currentPeriodEnd,
          },
  };
}
