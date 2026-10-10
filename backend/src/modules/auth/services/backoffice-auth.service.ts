import { Inject, Injectable } from '@nestjs/common';
import { type AuthConfig, authConfig } from '@config/index.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { assertAccountMayUse } from '@modules/auth/access-policy.js';
import {
  InvalidChallengeError,
  TotpAlreadyEnrolledError,
  TotpEnrolmentNotStartedError,
  TotpNotEnrolledError,
  UserNotFoundError,
} from '@modules/auth/auth.errors.js';
import {
  type Account,
  AUTH_REPOSITORY,
  type AuthRepository,
} from '@modules/auth/repositories/auth.repository.js';
import {
  TOTP_REPOSITORY,
  type TotpRepository,
  type TotpState,
} from '@modules/auth/repositories/totp.repository.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  type TransactionScope,
  UNIT_OF_WORK,
  type UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';
import { type AuthUserView, toUserView } from './auth.service.js';
import { CredentialsService } from './credentials.service.js';
import { TokenService } from './token.service.js';
import { type AuditTarget, TotpService } from './totp.service.js';

export interface Challenge {
  step: AuthStep;
  challengeToken: string;
  challengeExpiresAt: Date;
}

/** The opaque token goes into the cookie, never into the response body. */
export interface OpenedSession {
  sessionToken: string;
  sessionExpiresAt: Date;
  user: AuthUserView;
}

const HOUR_MS = 3_600_000;
const MAX_DEVICE_NAME_LENGTH = 100;

@Injectable()
export class BackofficeAuthService {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly tokens: TokenService,
    private readonly totp: TotpService,
    private readonly audit: AuditService,
    @Inject(AUTH_REPOSITORY) private readonly accounts: AuthRepository,
    @Inject(TOTP_REPOSITORY) private readonly totpStates: TotpRepository,
    @Inject(authConfig.KEY)
    private readonly config: Pick<AuthConfig, 'backofficeSessionHours'>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async login(email: string, password: string): Promise<Challenge> {
    const account = await this.credentials.verify(email, password);
    assertAccountMayUse(account, SessionChannel.BACKOFFICE);

    const state = await this.mustGetState(account.userId);
    this.totp.assertNotLocked(state);

    const step =
      state.enrolledAt === null
        ? AuthStep.TOTP_ENROLMENT
        : AuthStep.TOTP_VERIFICATION;
    const { token, expiresAt } = await this.tokens.createChallengeToken(
      account.userId,
      step,
    );
    return { step, challengeToken: token, challengeExpiresAt: expiresAt };
  }

  async startEnrolment(
    challengeToken: string,
  ): Promise<{ otpauthUrl: string; secret: string }> {
    const { state } = await this.resolveChallenge(
      challengeToken,
      AuthStep.TOTP_ENROLMENT,
    );
    if (state.enrolledAt !== null) throw new TotpAlreadyEnrolledError();
    return this.totp.startEnrolment(state);
  }

  async confirmEnrolment(
    challengeToken: string,
    code: string,
    client: ClientDetails,
  ): Promise<OpenedSession & { recoveryCodes: string[] }> {
    const { account, state } = await this.resolveChallenge(
      challengeToken,
      AuthStep.TOTP_ENROLMENT,
    );
    if (state.enrolledAt !== null) throw new TotpAlreadyEnrolledError();
    if (state.secretEncrypted === null)
      throw new TotpEnrolmentNotStartedError();

    await this.totp.checkCode(state, code, auditTarget(account, client));
    const recovery = await this.totp.generateRecoveryCodes();

    const session = await this.unitOfWork.run(async (scope) => {
      await this.totpStates.confirmEnrolment(
        account.userId,
        this.clock.now(),
        recovery.hashes,
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.TOTP_ENROLLED,
          actor: actorOf(account),
          target: { type: 'user', id: account.userId },
          establishmentId: account.establishment?.id ?? null,
          client,
        },
        scope,
      );
      return this.openSession(account, client, scope);
    });
    return { ...session, recoveryCodes: recovery.codes };
  }

  async verify(
    challengeToken: string,
    code: string,
    client: ClientDetails,
  ): Promise<OpenedSession> {
    const { account, state } = await this.resolveEnrolled(challengeToken);
    await this.totp.checkCode(state, code, auditTarget(account, client));

    return this.unitOfWork.run(async (scope) => {
      await this.totpStates.clearFailures(account.userId, scope);
      return this.openSession(account, client, scope);
    });
  }

  async recover(
    challengeToken: string,
    recoveryCode: string,
    client: ClientDetails,
  ): Promise<OpenedSession & { remainingRecoveryCodes: number }> {
    const { account, state } = await this.resolveEnrolled(challengeToken);
    const stored = await this.totp.checkRecoveryCode(
      state,
      recoveryCode,
      auditTarget(account, client),
    );

    const session = await this.unitOfWork.run(async (scope) => {
      // A concurrent use of the same code loses here.
      if (
        !(await this.totpStates.useRecoveryCode(
          stored.id,
          this.clock.now(),
          scope,
        ))
      ) {
        throw new InvalidChallengeError();
      }
      await this.totpStates.clearFailures(account.userId, scope);
      await this.audit.record(
        {
          action: AuditAction.RECOVERY_CODE_USED,
          actor: actorOf(account),
          target: { type: 'user', id: account.userId },
          establishmentId: account.establishment?.id ?? null,
          client,
        },
        scope,
      );
      return this.openSession(account, client, scope);
    });
    const remaining = await this.totpStates.listUnusedRecoveryCodes(
      account.userId,
    );
    return { ...session, remainingRecoveryCodes: remaining.length };
  }

  /** 2FA-04: the next sign-in goes through enrolment again. */
  async reset(
    actor: AuthenticatedUser,
    userId: string,
    client: ClientDetails,
  ): Promise<void> {
    const target = await this.accounts.findAccountById(userId);
    if (target === undefined) throw new UserNotFoundError(userId);

    await this.unitOfWork.run(async (scope) => {
      await this.totpStates.reset(userId, scope);
      await this.accounts.revokeUserSessions(
        userId,
        { at: this.clock.now(), by: actor.userId, reason: 'totp_reset' },
        { channel: SessionChannel.BACKOFFICE },
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.TOTP_RESET,
          actor,
          target: { type: 'user', id: userId },
          establishmentId: target.establishment?.id ?? null,
          client,
        },
        scope,
      );
    });
  }

  private async resolveEnrolled(
    challengeToken: string,
  ): Promise<{ account: Account; state: TotpState }> {
    const resolved = await this.resolveChallenge(
      challengeToken,
      AuthStep.TOTP_VERIFICATION,
    );
    if (resolved.state.enrolledAt === null) throw new TotpNotEnrolledError();
    return resolved;
  }

  // The account may have changed since the password step: check it again.
  private async resolveChallenge(
    challengeToken: string,
    step: AuthStep,
  ): Promise<{ account: Account; state: TotpState }> {
    const userId = await this.tokens.verifyChallengeToken(challengeToken, step);
    if (userId === undefined) throw new InvalidChallengeError();

    const account = await this.accounts.findAccountById(userId);
    if (account === undefined) throw new InvalidChallengeError();
    assertAccountMayUse(account, SessionChannel.BACKOFFICE);

    return { account, state: await this.mustGetState(userId) };
  }

  private async mustGetState(userId: string): Promise<TotpState> {
    const state = await this.totpStates.findState(userId);
    if (state === undefined) throw new InvalidChallengeError();
    return state;
  }

  private async openSession(
    account: Account,
    client: ClientDetails,
    scope: TransactionScope,
  ): Promise<OpenedSession> {
    const now = this.clock.now();
    const sessionToken = this.tokens.generateRefreshToken();
    const session = await this.accounts.createSession(
      {
        userId: account.userId,
        channel: SessionChannel.BACKOFFICE,
        refreshTokenHash: this.tokens.hashToken(sessionToken),
        deviceId: null,
        deviceName: client.userAgent?.slice(0, MAX_DEVICE_NAME_LENGTH) ?? null,
        platform: DevicePlatform.WEB,
        appVersion: null,
        createdAt: now,
        expiresAt: new Date(
          now.getTime() + this.config.backofficeSessionHours * HOUR_MS,
        ),
      },
      scope,
    );
    await this.accounts.recordLogin(account.userId, now, scope);
    return {
      sessionToken,
      sessionExpiresAt: session.expiresAt,
      user: toUserView(account),
    };
  }
}

function actorOf(account: Account): Pick<AuthenticatedUser, 'userId' | 'role'> {
  return { userId: account.userId, role: account.role };
}

function auditTarget(account: Account, client: ClientDetails): AuditTarget {
  return {
    userId: account.userId,
    establishmentId: account.establishment?.id ?? null,
    client,
  };
}
