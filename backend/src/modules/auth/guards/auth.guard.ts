import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type AppConfig, appConfig } from '@config/index.js';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@shared/interfaces/authenticated-user.interface.js';
import { IS_PUBLIC } from '@shared/decorators/public.decorator.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import { assertAccountMayUse } from '@modules/auth/access-policy.js';
import {
  SESSION_COOKIE,
  isUnsafeMethod,
} from '@modules/auth/auth.constants.js';
import {
  OriginNotAllowedError,
  SessionExpiredError,
  SessionRevokedError,
  UnauthenticatedError,
} from '@modules/auth/auth.errors.js';
import {
  type Account,
  AUTH_REPOSITORY,
  type AuthRepository,
  type StoredSession,
} from '@modules/auth/repositories/auth.repository.js';
import { TokenService } from '@modules/auth/services/token.service.js';

const BEARER = /^Bearer (\S+)$/;

/**
 * Global: every route requires a valid session unless marked @Public().
 * The session is read from the database on each request, so a revocation or
 * a deactivation applies at once (RG-04), not when the token expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    @Inject(AUTH_REPOSITORY) private readonly repository: AuthRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(appConfig.KEY)
    private readonly app: Pick<AppConfig, 'corsOrigins'>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const found = await this.findSession(request);
    if (found === undefined) throw new UnauthenticatedError();

    const { session, account } = found;
    if (session.revokedAt !== null) throw new SessionRevokedError();
    if (session.expiresAt <= this.clock.now()) throw new SessionExpiredError();
    assertAccountMayUse(account, session.channel);

    request.user = toAuthenticatedUser(session, account);
    return true;
  }

  private async findSession(
    request: AuthenticatedRequest,
  ): Promise<{ session: StoredSession; account: Account } | undefined> {
    const authorization = request.headers.authorization;
    if (authorization !== undefined) {
      const token = BEARER.exec(authorization)?.[1];
      const claims =
        token === undefined
          ? undefined
          : await this.tokens.verifyAccessToken(token);
      if (claims === undefined) return undefined;

      const found = await this.repository.findSessionWithAccount({
        sessionId: claims.sessionId,
      });
      return found?.session.userId === claims.userId &&
        found.session.channel === SessionChannel.MOBILE
        ? found
        : undefined;
    }

    const cookie: unknown = request.cookies?.[SESSION_COOKIE];
    if (typeof cookie !== 'string' || cookie === '') return undefined;

    // A cookie travels with any request the browser makes: refuse a state
    // change coming from a page that is not ours (CSRF).
    if (
      isUnsafeMethod(request.method) &&
      !this.app.corsOrigins.includes(request.headers.origin ?? '')
    ) {
      throw new OriginNotAllowedError();
    }

    const found = await this.repository.findSessionWithAccount({
      refreshTokenHash: this.tokens.hashToken(cookie),
    });
    return found?.session.channel === SessionChannel.BACKOFFICE
      ? found
      : undefined;
  }
}

function toAuthenticatedUser(
  session: StoredSession,
  account: Account,
): AuthenticatedUser {
  return {
    userId: account.userId,
    role: account.role,
    establishmentId: account.establishment?.id ?? null,
    sessionId: session.id,
    channel: session.channel,
  };
}
