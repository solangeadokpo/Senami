import { type SessionChannel } from '@shared/enums/session-channel.enum.js';
import { randomUUID } from 'node:crypto';
import type {
  Account,
  AuthRepository,
  NewSession,
  Revocation,
  SessionLookup,
  StoredSession,
} from './auth.repository.js';

interface FakeSession extends StoredSession {
  refreshTokenHash: Buffer;
  previousRefreshTokenHash: Buffer | null;
  revokedBy: string | null;
  revocationReason: string | null;
}

/** In memory, for unit tests. Honours the same filters and ordering. */
export class FakeAuthRepository implements AuthRepository {
  readonly accounts = new Map<
    string,
    Account & { passwordHash: string | null }
  >();
  readonly sessions = new Map<string, FakeSession>();
  readonly logins = new Map<string, Date>();

  addAccount(account: Account & { passwordHash: string | null }): void {
    this.accounts.set(account.userId, account);
  }

  findAccountByEmail(email: string) {
    const account = [...this.accounts.values()].find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
    );
    return Promise.resolve(account === undefined ? undefined : { ...account });
  }

  findAccountById(userId: string) {
    const account = this.accounts.get(userId);
    return Promise.resolve(
      account === undefined ? undefined : withoutPassword(account),
    );
  }

  findSessionWithAccount(lookup: SessionLookup) {
    const session =
      'sessionId' in lookup
        ? this.sessions.get(lookup.sessionId)
        : this.findBy((s) =>
            s.refreshTokenHash.equals(lookup.refreshTokenHash),
          );
    const account =
      session === undefined ? undefined : this.accounts.get(session.userId);
    return Promise.resolve(
      session === undefined || account === undefined
        ? undefined
        : { session: toStored(session), account: withoutPassword(account) },
    );
  }

  findSessionById(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return Promise.resolve(
      session === undefined ? undefined : toStored(session),
    );
  }

  findSessionByRefreshHash(hash: Buffer) {
    const session = this.findBy((s) => s.refreshTokenHash.equals(hash));
    return Promise.resolve(
      session === undefined ? undefined : toStored(session),
    );
  }

  findSessionByPreviousRefreshHash(hash: Buffer) {
    const session = this.findBy(
      (s) => s.previousRefreshTokenHash?.equals(hash) === true,
    );
    return Promise.resolve(
      session === undefined ? undefined : toStored(session),
    );
  }

  createSession(session: NewSession) {
    const created: FakeSession = {
      ...session,
      id: randomUUID(),
      lastUsedAt: session.createdAt,
      revokedAt: null,
      previousRefreshTokenHash: null,
      revokedBy: null,
      revocationReason: null,
    };
    this.sessions.set(created.id, created);
    return Promise.resolve(toStored(created));
  }

  rotateRefreshToken(rotation: {
    sessionId: string;
    currentHash: Buffer;
    nextHash: Buffer;
    expiresAt: Date;
    usedAt: Date;
  }) {
    const session = this.sessions.get(rotation.sessionId);
    if (
      session === undefined ||
      session.revokedAt !== null ||
      !session.refreshTokenHash.equals(rotation.currentHash)
    ) {
      return Promise.resolve(false);
    }
    session.previousRefreshTokenHash = rotation.currentHash;
    session.refreshTokenHash = rotation.nextHash;
    session.expiresAt = rotation.expiresAt;
    session.lastUsedAt = rotation.usedAt;
    return Promise.resolve(true);
  }

  revokeSession(sessionId: string, revocation: Revocation) {
    const session = this.sessions.get(sessionId);
    if (session !== undefined && session.revokedAt === null) {
      revoke(session, revocation);
    }
    return Promise.resolve();
  }

  revokeUserSessions(
    userId: string,
    revocation: Revocation,
    filter: { deviceId?: string; channel?: SessionChannel } = {},
  ) {
    const targets = [...this.sessions.values()].filter(
      (session) =>
        session.userId === userId &&
        session.revokedAt === null &&
        (filter.deviceId === undefined ||
          session.deviceId === filter.deviceId) &&
        (filter.channel === undefined || session.channel === filter.channel),
    );
    targets.forEach((session) => revoke(session, revocation));
    return Promise.resolve(targets.length);
  }

  listActiveSessions(userId: string, now: Date) {
    return Promise.resolve(
      [...this.sessions.values()]
        .filter(
          (session) =>
            session.userId === userId &&
            session.revokedAt === null &&
            session.expiresAt > now,
        )
        .sort((a, b) => b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
        .map(toStored),
    );
  }

  recordLogin(userId: string, at: Date) {
    this.logins.set(userId, at);
    return Promise.resolve();
  }

  private findBy(
    predicate: (session: FakeSession) => boolean,
  ): FakeSession | undefined {
    return [...this.sessions.values()].find(predicate);
  }
}

function revoke(session: FakeSession, revocation: Revocation): void {
  session.revokedAt = revocation.at;
  session.revokedBy = revocation.by;
  session.revocationReason = revocation.reason;
}

function toStored(session: FakeSession): StoredSession {
  return {
    id: session.id,
    userId: session.userId,
    channel: session.channel,
    deviceId: session.deviceId,
    deviceName: session.deviceName,
    platform: session.platform,
    appVersion: session.appVersion,
    createdAt: session.createdAt,
    lastUsedAt: session.lastUsedAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
  };
}

function withoutPassword(
  account: Account & { passwordHash: string | null },
): Account {
  const { passwordHash: _passwordHash, ...rest } = account;
  return rest;
}
