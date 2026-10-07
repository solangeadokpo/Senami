import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { randomUUID } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import type { AuthenticatedRequest } from '@shared/interfaces/authenticated-user.interface.js';
import { Public } from '@shared/decorators/public.decorator.js';
import { DAY_MS, FakeClock, MINUTE_MS } from '@shared/testing/fake-clock.js';
import { SESSION_COOKIE } from '@modules/auth/auth.constants.js';
import {
  AccountDeactivatedError,
  OriginNotAllowedError,
  SessionExpiredError,
  SessionRevokedError,
  SubscriptionSuspendedError,
  UnauthenticatedError,
} from '@modules/auth/auth.errors.js';
import { AuthGuard } from './auth.guard.js';
import type { Account } from '@modules/auth/repositories/auth.repository.js';
import { FakeAuthRepository } from '@modules/auth/repositories/auth.repository.fake.js';
import {
  buildAccount,
  createTokenService,
} from '@modules/auth/testing/auth-fixtures.js';
import type { TokenService } from '@modules/auth/services/token.service.js';

const ALLOWED_ORIGIN = 'https://app.senami.fr';

type GuardRequest = Pick<
  AuthenticatedRequest,
  'method' | 'headers' | 'cookies' | 'user'
>;

class ProbeController {
  protected(this: void): void {}

  @Public()
  open(this: void): void {}
}

describe('AuthGuard', () => {
  let clock: FakeClock;
  let tokens: TokenService;
  let repository: FakeAuthRepository;
  let guard: AuthGuard;

  beforeEach(() => {
    clock = new FakeClock();
    tokens = createTokenService(clock);
    repository = new FakeAuthRepository();
    guard = new AuthGuard(new Reflector(), tokens, repository, clock, {
      corsOrigins: [ALLOWED_ORIGIN],
    });
  });

  function addAccount(overrides: Partial<Account> = {}): Account {
    const account = buildAccount(overrides);
    repository.addAccount(account);
    return account;
  }

  async function mobileToken(account: Account) {
    const session = await repository.createSession({
      userId: account.userId,
      channel: SessionChannel.MOBILE,
      refreshTokenHash: tokens.hashToken(randomUUID()),
      deviceId: 'device-1',
      deviceName: null,
      platform: DevicePlatform.IOS,
      appVersion: '1.0.0',
      createdAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS),
    });
    const { token } = await tokens.createAccessToken({
      userId: account.userId,
      sessionId: session.id,
    });
    return { session, token };
  }

  async function backofficeCookie(account: Account) {
    const cookie = randomUUID();
    const session = await repository.createSession({
      userId: account.userId,
      channel: SessionChannel.BACKOFFICE,
      refreshTokenHash: tokens.hashToken(cookie),
      deviceId: 'browser',
      deviceName: null,
      platform: DevicePlatform.WEB,
      appVersion: '-',
      createdAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + DAY_MS),
    });
    return { session, cookie };
  }

  function request(
    overrides: Partial<Omit<GuardRequest, 'user'>> = {},
  ): GuardRequest {
    return { method: 'GET', headers: {}, cookies: {}, ...overrides };
  }

  function run(req: GuardRequest, handler: 'protected' | 'open' = 'protected') {
    return guard.canActivate(
      new ExecutionContextHost(
        [req],
        ProbeController,
        ProbeController.prototype[handler],
      ),
    );
  }

  it('lets a public route through without credential', async () => {
    await expect(run(request(), 'open')).resolves.toBe(true);
  });

  it('refuses a protected route without credential', async () => {
    await expect(run(request())).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('refuses a malformed or forged bearer token', async () => {
    await expect(
      run(request({ headers: { authorization: 'Bearer not-a-jwt' } })),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('admits a valid mobile session and exposes the user', async () => {
    const account = addAccount();
    const { session, token } = await mobileToken(account);
    const req = request({ headers: { authorization: `Bearer ${token}` } });

    await expect(run(req)).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: account.userId,
      role: UserRole.INTERVENANT,
      establishmentId: account.establishment?.id,
      sessionId: session.id,
      channel: SessionChannel.MOBILE,
    });
  });

  it('refuses a revoked session before the access token expires', async () => {
    const account = addAccount();
    const { session, token } = await mobileToken(account);
    await repository.revokeSession(session.id, {
      at: clock.now(),
      by: null,
      reason: 'test',
    });

    await expect(
      run(request({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(SessionRevokedError);
  });

  it('refuses an expired session', async () => {
    const account = addAccount();
    const { session, token } = await mobileToken(account);
    const stored = repository.sessions.get(session.id);
    if (stored !== undefined)
      stored.expiresAt = new Date(clock.now().getTime() + MINUTE_MS);
    clock.advance(2 * MINUTE_MS);

    await expect(
      run(request({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('refuses a user deactivated after sign-in', async () => {
    const account = addAccount();
    const { token } = await mobileToken(account);
    repository.addAccount({
      ...buildAccount(),
      ...account,
      status: UserStatus.DEACTIVATED,
      passwordHash: null,
    });

    await expect(
      run(request({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(AccountDeactivatedError);
  });

  it('refuses the mobile app when the subscription is suspended', async () => {
    const account = addAccount({
      subscription: {
        status: SubscriptionStatus.SUSPENDED,
        currentPeriodEnd: null,
      },
    });
    const { token } = await mobileToken(account);

    await expect(
      run(request({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(SubscriptionSuspendedError);
  });

  it('refuses a token whose user does not own the session', async () => {
    const account = addAccount();
    const { session } = await mobileToken(account);
    const { token } = await tokens.createAccessToken({
      userId: randomUUID(),
      sessionId: session.id,
    });

    await expect(
      run(request({ headers: { authorization: `Bearer ${token}` } })),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('admits the back office cookie despite a suspended subscription', async () => {
    const account = addAccount({
      role: UserRole.RESPONSABLE,
      subscription: {
        status: SubscriptionStatus.SUSPENDED,
        currentPeriodEnd: null,
      },
    });
    const { cookie } = await backofficeCookie(account);
    const req = request({ cookies: { [SESSION_COOKIE]: cookie } });

    await expect(run(req)).resolves.toBe(true);
    expect(req.user?.channel).toBe(SessionChannel.BACKOFFICE);
  });

  it('refuses a cookie state change from another origin', async () => {
    const account = addAccount({ role: UserRole.RESPONSABLE });
    const { cookie } = await backofficeCookie(account);

    await expect(
      run(
        request({
          method: 'POST',
          headers: { origin: 'https://evil.example' },
          cookies: { [SESSION_COOKIE]: cookie },
        }),
      ),
    ).rejects.toBeInstanceOf(OriginNotAllowedError);
  });

  it('admits a cookie state change from the back office origin', async () => {
    const account = addAccount({ role: UserRole.RESPONSABLE });
    const { cookie } = await backofficeCookie(account);

    await expect(
      run(
        request({
          method: 'POST',
          headers: { origin: ALLOWED_ORIGIN },
          cookies: { [SESSION_COOKIE]: cookie },
        }),
      ),
    ).resolves.toBe(true);
  });

  it('refuses a mobile refresh token presented as a cookie', async () => {
    const account = addAccount();
    const refreshToken = randomUUID();
    await repository.createSession({
      userId: account.userId,
      channel: SessionChannel.MOBILE,
      refreshTokenHash: tokens.hashToken(refreshToken),
      deviceId: 'device-1',
      deviceName: null,
      platform: DevicePlatform.IOS,
      appVersion: '1.0.0',
      createdAt: clock.now(),
      expiresAt: new Date(clock.now().getTime() + DAY_MS),
    });

    await expect(
      run(request({ cookies: { [SESSION_COOKIE]: refreshToken } })),
    ).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
