import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { DAY_MS, FakeClock } from '@shared/testing/fake-clock.js';
import {
  SessionNotFoundError,
  UserNotFoundError,
} from '@modules/auth/auth.errors.js';
import type { Account } from '@modules/auth/repositories/auth.repository.js';
import { FakeAuthRepository } from '@modules/auth/repositories/auth.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import { SessionsService } from './sessions.service.js';
import {
  ESTABLISHMENT_ID,
  buildAccount,
} from '@modules/auth/testing/auth-fixtures.js';

describe('SessionsService', () => {
  let clock: FakeClock;
  let repository: FakeAuthRepository;
  let audit: FakeAuditRepository;
  let service: SessionsService;
  const client: ClientDetails = {
    ipAddress: '203.0.113.7',
    userAgent: 'Vitest',
  };

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeAuthRepository();
    audit = new FakeAuditRepository();
    service = new SessionsService(
      repository,
      clock,
      new AuditService(audit, clock),
      new FakeUnitOfWork(),
    );
  });

  function addAccount(overrides: Partial<Account> = {}): Account {
    const account = buildAccount(overrides);
    repository.addAccount(account);
    return account;
  }

  async function addSession(userId: string, deviceId: string = randomUUID()) {
    const session = await repository.createSession({
      userId,
      channel: SessionChannel.MOBILE,
      refreshTokenHash: Buffer.from(randomUUID()),
      deviceId,
      deviceName: deviceId,
      platform: DevicePlatform.IOS,
      appVersion: '1.0.0',
      createdAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS),
    });
    clock.advance(1000);
    return session;
  }

  function actor(
    account: Account,
    sessionId: string = randomUUID(),
  ): AuthenticatedUser {
    return {
      userId: account.userId,
      role: account.role,
      establishmentId: account.establishment?.id ?? null,
      sessionId,
      channel: SessionChannel.MOBILE,
    };
  }

  describe('listOwn', () => {
    it('lists the active sessions, most recent first, flagging the current one', async () => {
      const account = addAccount();
      const older = await addSession(account.userId);
      const current = await addSession(account.userId);

      const sessions = await service.listOwn(actor(account, current.id));

      expect(sessions.map((s) => [s.id, s.current])).toEqual([
        [current.id, true],
        [older.id, false],
      ]);
    });

    it('leaves out revoked, expired and other users sessions', async () => {
      const account = addAccount();
      const other = addAccount();
      const revoked = await addSession(account.userId);
      await repository.revokeSession(revoked.id, {
        at: clock.now(),
        by: null,
        reason: 'test',
      });
      await addSession(other.userId);
      const expiring = await addSession(account.userId);
      clock.advance(31 * DAY_MS);

      expect(await service.listOwn(actor(account, expiring.id))).toEqual([]);
    });
  });

  describe('revokeOwn', () => {
    it('revokes one of the caller sessions', async () => {
      const account = addAccount();
      const session = await addSession(account.userId);

      await service.revokeOwn(actor(account), session.id);

      expect(repository.sessions.get(session.id)?.revocationReason).toBe(
        'revoked_by_user',
      );
    });

    it('refuses another user session', async () => {
      const account = addAccount();
      const other = addAccount();
      const session = await addSession(other.userId);

      await expect(
        service.revokeOwn(actor(account), session.id),
      ).rejects.toBeInstanceOf(SessionNotFoundError);
      expect(repository.sessions.get(session.id)?.revokedAt).toBeNull();
    });

    it('refuses an already revoked session', async () => {
      const account = addAccount();
      const session = await addSession(account.userId);
      await service.revokeOwn(actor(account), session.id);

      await expect(
        service.revokeOwn(actor(account), session.id),
      ).rejects.toBeInstanceOf(SessionNotFoundError);
    });
  });

  describe('revokeAllOfUser', () => {
    it('lets a responsable revoke any user of their establishment', async () => {
      const responsable = addAccount({ role: UserRole.RESPONSABLE });
      const colleague = addAccount({ role: UserRole.RESPONSABLE });
      await addSession(colleague.userId);
      await addSession(colleague.userId);

      await service.revokeAllOfUser(
        actor(responsable),
        colleague.userId,
        client,
      );

      expect(
        await repository.listActiveSessions(colleague.userId, clock.now()),
      ).toEqual([]);
      expect(audit.rows).toEqual([
        expect.objectContaining({
          action: AuditAction.SESSIONS_REVOKED,
          actorUserId: responsable.userId,
          actorRole: UserRole.RESPONSABLE,
          targetType: 'user',
          targetId: colleague.userId,
          establishmentId: ESTABLISHMENT_ID,
          details: { revokedSessions: 2 },
          ipAddress: client.ipAddress,
          userAgent: client.userAgent,
        }),
      ]);
    });

    it('hides the users of another establishment from a responsable', async () => {
      const responsable = addAccount({ role: UserRole.RESPONSABLE });
      const stranger = addAccount({
        establishment: {
          id: randomUUID(),
          name: 'Autre',
          status: EstablishmentStatus.ACTIVE,
        },
      });
      await addSession(stranger.userId);

      await expect(
        service.revokeAllOfUser(actor(responsable), stranger.userId, client),
      ).rejects.toBeInstanceOf(UserNotFoundError);
      expect(
        await repository.listActiveSessions(stranger.userId, clock.now()),
      ).toHaveLength(1);
      expect(audit.rows).toEqual([]);
    });

    it('hides the super admin from a responsable', async () => {
      const responsable = addAccount({ role: UserRole.RESPONSABLE });
      const superAdmin = addAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      });

      await expect(
        service.revokeAllOfUser(actor(responsable), superAdmin.userId, client),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('answers USER_NOT_FOUND for an unknown user', async () => {
      const responsable = addAccount({ role: UserRole.RESPONSABLE });

      await expect(
        service.revokeAllOfUser(actor(responsable), randomUUID(), client),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('lets a super admin revoke anyone', async () => {
      const superAdmin = addAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      });
      const target = addAccount({
        establishment: {
          id: ESTABLISHMENT_ID,
          name: 'École',
          status: EstablishmentStatus.ACTIVE,
        },
      });
      await addSession(target.userId);

      await service.revokeAllOfUser(actor(superAdmin), target.userId, client);

      expect(
        await repository.listActiveSessions(target.userId, clock.now()),
      ).toEqual([]);
    });
  });
});
