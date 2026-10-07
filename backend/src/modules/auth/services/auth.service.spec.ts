import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { DAY_MS, FakeClock } from '@shared/testing/fake-clock.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import {
  AccountDeactivatedError,
  AccountNotActivatedError,
  ChannelNotAllowedError,
  EstablishmentSuspendedError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
  SessionExpiredError,
  SessionRevokedError,
  SubscriptionSuspendedError,
} from '@modules/auth/auth.errors.js';
import type { Account } from '@modules/auth/repositories/auth.repository.js';
import { FakeAuthRepository } from '@modules/auth/repositories/auth.repository.fake.js';
import { AuthService, type MobileLoginInput } from './auth.service.js';
import { CredentialsService } from './credentials.service.js';
import { PasswordHasherService } from './password-hasher.service.js';
import {
  TEST_AUTH_CONFIG,
  buildAccount,
  createTokenService,
} from '@modules/auth/testing/auth-fixtures.js';

const PASSWORD = 'correct horse battery staple';
const hasher = new PasswordHasherService();
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hasher.hash(PASSWORD);
});

describe('AuthService', () => {
  let clock: FakeClock;
  let repository: FakeAuthRepository;
  let service: AuthService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeAuthRepository();
    service = new AuthService(
      repository,
      new CredentialsService(repository, hasher),
      createTokenService(clock),
      TEST_AUTH_CONFIG,
      clock,
    );
  });

  function addAccount(overrides: Partial<Account> = {}) {
    const account = buildAccount(overrides, passwordHash);
    repository.addAccount(account);
    return account;
  }

  function loginInput(
    email: string,
    overrides: Partial<MobileLoginInput> = {},
  ): MobileLoginInput {
    return {
      email,
      password: PASSWORD,
      device: {
        id: 'device-1',
        name: 'iPhone',
        platform: DevicePlatform.IOS,
        appVersion: '1.0.0',
      },
      ...overrides,
    };
  }

  describe('loginMobile', () => {
    it('signs in an active intervenant', async () => {
      const account = addAccount();

      const result = await service.loginMobile(loginInput(account.email));

      expect(result.user).toEqual({
        id: account.userId,
        email: account.email,
        firstName: 'Léa',
        lastName: 'Martin',
        role: UserRole.INTERVENANT,
        establishment: {
          id: account.establishment?.id,
          name: 'École Saint-Denis',
        },
      });
      expect(result.accessToken).not.toBe('');
      expect(result.refreshToken).not.toBe('');
      expect(result.sessionExpiresAt).toEqual(
        new Date(clock.now().getTime() + 30 * DAY_MS),
      );
      expect(repository.logins.get(account.userId)).toEqual(clock.now());
    });

    it('signs in a responsable', async () => {
      const account = addAccount({ role: UserRole.RESPONSABLE });

      const result = await service.loginMobile(loginInput(account.email));

      expect(result.user.role).toBe(UserRole.RESPONSABLE);
    });

    it('matches the email whatever its case', async () => {
      const account = addAccount();

      await expect(
        service.loginMobile(loginInput(account.email.toUpperCase())),
      ).resolves.toBeDefined();
    });

    it('stores the session with its device and only a hash of the token', async () => {
      const account = addAccount();

      const { refreshToken } = await service.loginMobile(
        loginInput(account.email),
      );

      const [session] = [...repository.sessions.values()];
      expect(session).toMatchObject({
        userId: account.userId,
        channel: SessionChannel.MOBILE,
        deviceId: 'device-1',
        deviceName: 'iPhone',
        platform: DevicePlatform.IOS,
        appVersion: '1.0.0',
      });
      expect(session?.refreshTokenHash.toString()).not.toContain(refreshToken);
    });

    it('rejects a wrong password', async () => {
      const account = addAccount();

      await expect(
        service.loginMobile({
          ...loginInput(account.email),
          password: 'wrong',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rejects an unknown email with the same error', async () => {
      await expect(
        service.loginMobile(loginInput('nobody@ecole.test')),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('does not disclose the account state without the right password', async () => {
      const account = addAccount({ status: UserStatus.DEACTIVATED });

      await expect(
        service.loginMobile({
          ...loginInput(account.email),
          password: 'wrong',
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it.each([
      [
        'an invited user',
        { status: UserStatus.INVITED },
        AccountNotActivatedError,
      ],
      [
        'a deactivated user',
        { status: UserStatus.DEACTIVATED },
        AccountDeactivatedError,
      ],
      [
        'a super admin',
        { role: UserRole.SUPER_ADMIN, establishment: null, subscription: null },
        ChannelNotAllowedError,
      ],
      [
        'a suspended establishment',
        {
          establishment: {
            id: 'e1',
            name: 'École',
            status: EstablishmentStatus.SUSPENDED,
          },
        },
        EstablishmentSuspendedError,
      ],
      [
        'a suspended subscription',
        {
          subscription: {
            status: SubscriptionStatus.SUSPENDED,
            currentPeriodEnd: null,
          },
        },
        SubscriptionSuspendedError,
      ],
    ] as const)('rejects %s', async (_label, overrides, error) => {
      const account = addAccount(overrides);

      await expect(
        service.loginMobile(loginInput(account.email)),
      ).rejects.toBeInstanceOf(error);
      expect(repository.sessions.size).toBe(0);
    });

    it('accepts a subscription in dunning (past_due)', async () => {
      const account = addAccount({
        subscription: {
          status: SubscriptionStatus.PAST_DUE,
          currentPeriodEnd: null,
        },
      });

      await expect(
        service.loginMobile(loginInput(account.email)),
      ).resolves.toBeDefined();
    });

    it('revokes the previous session of the same device only', async () => {
      const account = addAccount();
      await service.loginMobile(loginInput(account.email));
      await service.loginMobile(
        loginInput(account.email, {
          device: {
            id: 'device-2',
            platform: DevicePlatform.ANDROID,
            appVersion: '1.0.0',
          },
        }),
      );

      await service.loginMobile(loginInput(account.email));

      const active = await repository.listActiveSessions(
        account.userId,
        clock.now(),
      );
      expect(active.map((s) => s.deviceId).sort()).toEqual([
        'device-1',
        'device-2',
      ]);
      expect(repository.sessions.size).toBe(3);
    });
  });

  describe('refreshMobile', () => {
    it('rotates the refresh token', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));

      const refreshed = await service.refreshMobile(login.refreshToken);

      expect(refreshed.refreshToken).not.toBe(login.refreshToken);
      await expect(
        service.refreshMobile(refreshed.refreshToken),
      ).resolves.toBeDefined();
    });

    it('slides the session expiry', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));
      clock.advance(10 * DAY_MS);

      const refreshed = await service.refreshMobile(login.refreshToken);

      expect(refreshed.sessionExpiresAt).toEqual(
        new Date(clock.now().getTime() + 30 * DAY_MS),
      );
    });

    it('rejects an unknown refresh token', async () => {
      await expect(service.refreshMobile('unknown')).rejects.toBeInstanceOf(
        InvalidRefreshTokenError,
      );
    });

    it('revokes the session when a rotated token is replayed', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));
      const refreshed = await service.refreshMobile(login.refreshToken);

      await expect(
        service.refreshMobile(login.refreshToken),
      ).rejects.toBeInstanceOf(RefreshTokenReusedError);
      await expect(
        service.refreshMobile(refreshed.refreshToken),
      ).rejects.toBeInstanceOf(SessionRevokedError);
    });

    it('rejects a revoked session', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));
      await repository.revokeUserSessions(account.userId, {
        at: clock.now(),
        by: null,
        reason: 'test',
      });

      await expect(
        service.refreshMobile(login.refreshToken),
      ).rejects.toBeInstanceOf(SessionRevokedError);
    });

    it('rejects an expired session', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));
      clock.advance(31 * DAY_MS);

      await expect(
        service.refreshMobile(login.refreshToken),
      ).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it('re-checks the account', async () => {
      const account = addAccount();
      const login = await service.loginMobile(loginInput(account.email));
      repository.addAccount({ ...account, status: UserStatus.DEACTIVATED });

      await expect(
        service.refreshMobile(login.refreshToken),
      ).rejects.toBeInstanceOf(AccountDeactivatedError);
    });
  });

  describe('logout and me', () => {
    async function signedInUser(): Promise<AuthenticatedUser> {
      const account = addAccount();
      await service.loginMobile(loginInput(account.email));
      const [session] = [...repository.sessions.values()];
      if (session === undefined) throw new Error('no session');
      return {
        userId: account.userId,
        role: account.role,
        establishmentId: account.establishment?.id ?? null,
        sessionId: session.id,
        channel: SessionChannel.MOBILE,
      };
    }

    it('revokes the current session on logout', async () => {
      const user = await signedInUser();

      await service.logout(user);

      expect(repository.sessions.get(user.sessionId)?.revokedAt).toEqual(
        clock.now(),
      );
    });

    it('describes the current user with channel and subscription', async () => {
      const user = await signedInUser();

      expect(await service.me(user)).toMatchObject({
        id: user.userId,
        role: UserRole.INTERVENANT,
        channel: SessionChannel.MOBILE,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: null,
        },
      });
    });
  });
});
