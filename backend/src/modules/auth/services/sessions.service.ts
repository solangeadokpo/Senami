import { UserRole } from '@shared/enums/user-role.enum.js';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  SessionNotFoundError,
  UserNotFoundError,
} from '@modules/auth/auth.errors.js';
import {
  AUTH_REPOSITORY,
  type AuthRepository,
  type StoredSession,
} from '@modules/auth/repositories/auth.repository.js';

export type SessionView = Pick<
  StoredSession,
  | 'id'
  | 'channel'
  | 'deviceName'
  | 'platform'
  | 'appVersion'
  | 'createdAt'
  | 'lastUsedAt'
> & { current: boolean };

@Injectable()
export class SessionsService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async listOwn(user: AuthenticatedUser): Promise<SessionView[]> {
    const sessions = await this.repository.listActiveSessions(
      user.userId,
      this.clock.now(),
    );
    return sessions.map((session) => ({
      id: session.id,
      channel: session.channel,
      deviceName: session.deviceName,
      platform: session.platform,
      appVersion: session.appVersion,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      current: session.id === user.sessionId,
    }));
  }

  async revokeOwn(user: AuthenticatedUser, sessionId: string): Promise<void> {
    const session = await this.repository.findSessionById(sessionId);
    if (
      session === undefined ||
      session.userId !== user.userId ||
      session.revokedAt !== null
    ) {
      throw new SessionNotFoundError(sessionId);
    }
    await this.repository.revokeSession(sessionId, {
      at: this.clock.now(),
      by: user.userId,
      reason: 'revoked_by_user',
    });
  }

  /** MOB-03. A responsable reaches the users of their establishment only. */
  async revokeAllOfUser(
    actor: AuthenticatedUser,
    userId: string,
  ): Promise<void> {
    const target = await this.repository.findAccountById(userId);
    const reachable =
      target !== undefined &&
      (actor.role === UserRole.SUPER_ADMIN ||
        (target.establishment !== null &&
          target.establishment.id === actor.establishmentId));
    // Same answer for an unknown user and another establishment's user.
    if (!reachable) throw new UserNotFoundError(userId);

    await this.repository.revokeUserSessions(userId, {
      at: this.clock.now(),
      by: actor.userId,
      reason: 'revoked_by_administrator',
    });
  }
}
