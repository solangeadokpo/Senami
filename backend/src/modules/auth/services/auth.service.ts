import type { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { Inject, Injectable } from '@nestjs/common';
import { type AuthConfig, authConfig } from '@config/index.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import { assertAccountMayUse } from '@modules/auth/access-policy.js';
import {
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenReusedError,
  SessionExpiredError,
  SessionRevokedError,
  UnauthenticatedError,
} from '@modules/auth/auth.errors.js';
import {
  type Account,
  AUTH_REPOSITORY,
  type AuthRepository,
} from '@modules/auth/repositories/auth.repository.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { TokenService } from './token.service.js';

export interface MobileLoginInput {
  email: string;
  password: string;
  device: {
    id: string;
    name?: string;
    platform: DevicePlatform;
    appVersion: string;
  };
}

export interface TokenPair {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  sessionExpiresAt: Date;
}

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Account['role'];
  establishment: { id: string; name: string } | null;
}

export interface MeView extends AuthUserView {
  channel: AuthenticatedUser['channel'];
  subscription: Account['subscription'];
}

const DAY_MS = 86_400_000;

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    private readonly passwords: PasswordHasherService,
    private readonly tokens: TokenService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async loginMobile(
    input: MobileLoginInput,
  ): Promise<TokenPair & { user: AuthUserView }> {
    const account = await this.repository.findAccountByEmail(input.email);
    if (account === undefined || account.passwordHash === null) {
      await this.passwords.verifyAgainstDummy(input.password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.passwords.verify(account.passwordHash, input.password))) {
      throw new InvalidCredentialsError();
    }

    // Account states are disclosed only to someone who knows the password.
    assertAccountMayUse(account, SessionChannel.MOBILE);

    const now = this.clock.now();
    await this.repository.revokeUserSessions(
      account.userId,
      { at: now, by: account.userId, reason: 'replaced_on_device' },
      input.device.id,
    );

    const refreshToken = this.tokens.generateRefreshToken();
    const session = await this.repository.createSession({
      userId: account.userId,
      channel: SessionChannel.MOBILE,
      refreshTokenHash: this.tokens.hashToken(refreshToken),
      deviceId: input.device.id,
      deviceName: input.device.name ?? null,
      platform: input.device.platform,
      appVersion: input.device.appVersion,
      createdAt: now,
      expiresAt: this.mobileSessionExpiry(now),
    });
    await this.repository.recordLogin(account.userId, now);

    const access = await this.tokens.createAccessToken({
      userId: account.userId,
      sessionId: session.id,
    });

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken,
      sessionExpiresAt: session.expiresAt,
      user: toUserView(account),
    };
  }

  async refreshMobile(refreshToken: string): Promise<TokenPair> {
    const now = this.clock.now();
    const hash = this.tokens.hashToken(refreshToken);

    const session = await this.repository.findSessionByRefreshHash(hash);
    if (session === undefined) {
      await this.rejectReplay(hash, now);
      throw new InvalidRefreshTokenError();
    }
    if (session.channel !== SessionChannel.MOBILE)
      throw new InvalidRefreshTokenError();
    if (session.revokedAt !== null) throw new SessionRevokedError();
    if (session.expiresAt <= now) throw new SessionExpiredError();

    const account = await this.repository.findAccountById(session.userId);
    if (account === undefined) throw new InvalidRefreshTokenError();
    assertAccountMayUse(account, SessionChannel.MOBILE);

    const nextRefreshToken = this.tokens.generateRefreshToken();
    const sessionExpiresAt = this.mobileSessionExpiry(now);
    const rotated = await this.repository.rotateRefreshToken({
      sessionId: session.id,
      currentHash: hash,
      nextHash: this.tokens.hashToken(nextRefreshToken),
      expiresAt: sessionExpiresAt,
      usedAt: now,
    });
    // A concurrent refresh rotated it first.
    if (!rotated) throw new InvalidRefreshTokenError();

    const access = await this.tokens.createAccessToken({
      userId: account.userId,
      sessionId: session.id,
    });
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshToken: nextRefreshToken,
      sessionExpiresAt,
    };
  }

  async logout(user: AuthenticatedUser): Promise<void> {
    await this.repository.revokeSession(user.sessionId, {
      at: this.clock.now(),
      by: user.userId,
      reason: 'logout',
    });
  }

  async me(user: AuthenticatedUser): Promise<MeView> {
    const account = await this.repository.findAccountById(user.userId);
    if (account === undefined) throw new UnauthenticatedError();
    return {
      ...toUserView(account),
      channel: user.channel,
      subscription: account.subscription,
    };
  }

  // A rotated token presented again: stolen, or replayed by a buggy client.
  // Either way the session is no longer trustworthy.
  private async rejectReplay(hash: Buffer, now: Date): Promise<void> {
    const replayed =
      await this.repository.findSessionByPreviousRefreshHash(hash);
    if (replayed === undefined) return;

    if (replayed.revokedAt === null) {
      await this.repository.revokeSession(replayed.id, {
        at: now,
        by: null,
        reason: 'refresh_token_reused',
      });
    }
    throw new RefreshTokenReusedError(replayed.id);
  }

  private mobileSessionExpiry(from: Date): Date {
    return new Date(from.getTime() + this.config.mobileSessionDays * DAY_MS);
  }
}

function toUserView(account: Account): AuthUserView {
  return {
    id: account.userId,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    role: account.role,
    establishment:
      account.establishment === null
        ? null
        : { id: account.establishment.id, name: account.establishment.name },
  };
}
