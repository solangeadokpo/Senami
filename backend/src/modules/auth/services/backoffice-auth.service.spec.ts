import { randomUUID } from 'node:crypto';
import { Secret, TOTP } from 'otpauth';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import {
  AccountDeactivatedError,
  ChannelNotAllowedError,
  EstablishmentSuspendedError,
  InvalidChallengeError,
  InvalidCredentialsError,
  InvalidTotpCodeError,
  TotpAlreadyEnrolledError,
  TotpEnrolmentNotStartedError,
  TotpLockedError,
  UserNotFoundError,
} from '@modules/auth/auth.errors.js';
import type { Account } from '@modules/auth/repositories/auth.repository.js';
import { FakeAuthRepository } from '@modules/auth/repositories/auth.repository.fake.js';
import { FakeTotpRepository } from '@modules/auth/repositories/totp.repository.fake.js';
import {
  ESTABLISHMENT_ID,
  TEST_AUTH_CONFIG,
  buildAccount,
  createTokenService,
} from '@modules/auth/testing/auth-fixtures.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { DAY_MS, FakeClock, MINUTE_MS } from '@shared/testing/fake-clock.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import { BackofficeAuthService } from './backoffice-auth.service.js';
import { CredentialsService } from './credentials.service.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { SecretCipherService } from './secret-cipher.service.js';
import { type TokenService } from './token.service.js';
import { TotpService } from './totp.service.js';

const PASSWORD = 'correct horse battery staple';
const hasher = new PasswordHasherService();
const client: ClientDetails = {
  ipAddress: '203.0.113.7',
  userAgent: 'Firefox',
};
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hasher.hash(PASSWORD);
});

describe('BackofficeAuthService', () => {
  let clock: FakeClock;
  let accounts: FakeAuthRepository;
  let totpStates: FakeTotpRepository;
  let audit: FakeAuditRepository;
  let tokens: TokenService;
  let service: BackofficeAuthService;

  beforeEach(() => {
    clock = new FakeClock();
    accounts = new FakeAuthRepository();
    totpStates = new FakeTotpRepository();
    audit = new FakeAuditRepository();
    tokens = createTokenService(clock);
    const auditService = new AuditService(audit, clock);
    const unitOfWork = new FakeUnitOfWork();
    service = new BackofficeAuthService(
      new CredentialsService(accounts, hasher),
      tokens,
      new TotpService(
        totpStates,
        new SecretCipherService(TEST_AUTH_CONFIG),
        hasher,
        auditService,
        clock,
        unitOfWork,
      ),
      auditService,
      accounts,
      totpStates,
      TEST_AUTH_CONFIG,
      clock,
      unitOfWork,
    );
  });

  function addAccount(overrides: Partial<Account> = {}): Account {
    const account = buildAccount(
      { role: UserRole.RESPONSABLE, ...overrides },
      passwordHash,
    );
    accounts.addAccount(account);
    totpStates.addUser(account.userId, account.email);
    return account;
  }

  function codeAt(secret: string, at: Date = clock.now()): string {
    return new TOTP({ secret: Secret.fromBase32(secret) }).generate({
      timestamp: at.getTime(),
    });
  }

  /** Enrols the account, returns its secret and recovery codes. */
  async function enrol(account: Account) {
    const { challengeToken } = await service.login(account.email, PASSWORD);
    const { secret } = await service.startEnrolment(challengeToken);
    const { recoveryCodes } = await service.confirmEnrolment(
      challengeToken,
      codeAt(secret),
      client,
    );
    clock.advance(MINUTE_MS);
    return { secret, recoveryCodes };
  }

  function actor(account: Account): AuthenticatedUser {
    return {
      userId: account.userId,
      role: account.role,
      establishmentId: account.establishment?.id ?? null,
      sessionId: randomUUID(),
      channel: SessionChannel.BACKOFFICE,
    };
  }

  describe('login', () => {
    it('asks a first sign-in to enrol', async () => {
      const account = addAccount();

      const challenge = await service.login(account.email, PASSWORD);

      expect(challenge.step).toBe(AuthStep.TOTP_ENROLMENT);
      expect(challenge.challengeExpiresAt).toEqual(
        new Date(clock.now().getTime() + 5 * MINUTE_MS),
      );
    });

    it('asks an enrolled user for a code', async () => {
      const account = addAccount();
      await enrol(account);

      const challenge = await service.login(account.email, PASSWORD);

      expect(challenge.step).toBe(AuthStep.TOTP_VERIFICATION);
    });

    it('refuses a wrong password', async () => {
      const account = addAccount();

      await expect(
        service.login(account.email, 'wrong password'),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('refuses an intervenant', async () => {
      const account = addAccount({ role: UserRole.INTERVENANT });

      await expect(
        service.login(account.email, PASSWORD),
      ).rejects.toBeInstanceOf(ChannelNotAllowedError);
    });

    it('admits a super admin without establishment', async () => {
      const account = addAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      });

      await expect(
        service.login(account.email, PASSWORD),
      ).resolves.toMatchObject({ step: AuthStep.TOTP_ENROLMENT });
    });

    it('admits a responsable whose subscription is suspended', async () => {
      const account = addAccount({
        subscription: {
          status: SubscriptionStatus.SUSPENDED,
          currentPeriodEnd: null,
        },
      });

      await expect(
        service.login(account.email, PASSWORD),
      ).resolves.toMatchObject({ step: AuthStep.TOTP_ENROLMENT });
    });

    it('refuses a responsable whose establishment is suspended', async () => {
      const account = addAccount({
        establishment: {
          id: ESTABLISHMENT_ID,
          name: 'École',
          status: EstablishmentStatus.SUSPENDED,
        },
      });

      await expect(
        service.login(account.email, PASSWORD),
      ).rejects.toBeInstanceOf(EstablishmentSuspendedError);
    });

    it('refuses a locked user before any code', async () => {
      const account = addAccount();
      await totpStates.lock(
        account.userId,
        new Date(clock.now().getTime() + 10 * MINUTE_MS),
      );

      await expect(
        service.login(account.email, PASSWORD),
      ).rejects.toBeInstanceOf(TotpLockedError);
    });
  });

  describe('enrolment', () => {
    it('opens a 12 hour back office session and gives ten recovery codes', async () => {
      const account = addAccount();
      const { challengeToken } = await service.login(account.email, PASSWORD);
      const { secret } = await service.startEnrolment(challengeToken);

      const opened = await service.confirmEnrolment(
        challengeToken,
        codeAt(secret),
        client,
      );

      expect(opened.recoveryCodes).toHaveLength(10);
      expect(opened.user.id).toBe(account.userId);
      expect(opened.sessionExpiresAt).toEqual(
        new Date(clock.now().getTime() + 12 * 60 * MINUTE_MS),
      );
      const [session] = await accounts.listActiveSessions(
        account.userId,
        clock.now(),
      );
      expect(session).toMatchObject({
        channel: SessionChannel.BACKOFFICE,
        platform: DevicePlatform.WEB,
        deviceName: 'Firefox',
      });
      expect(accounts.logins.get(account.userId)).toEqual(clock.now());
      expect(audit.rows).toEqual([
        expect.objectContaining({
          action: AuditAction.TOTP_ENROLLED,
          actorUserId: account.userId,
          targetId: account.userId,
          establishmentId: ESTABLISHMENT_ID,
        }),
      ]);
    });

    it('refuses a confirmation before the QR code', async () => {
      const account = addAccount();
      const { challengeToken } = await service.login(account.email, PASSWORD);

      await expect(
        service.confirmEnrolment(challengeToken, '123456', client),
      ).rejects.toBeInstanceOf(TotpEnrolmentNotStartedError);
    });

    it('refuses a second enrolment with an old challenge', async () => {
      const account = addAccount();
      const { challengeToken } = await service.login(account.email, PASSWORD);
      const { secret } = await service.startEnrolment(challengeToken);
      await service.confirmEnrolment(challengeToken, codeAt(secret), client);

      await expect(
        service.startEnrolment(challengeToken),
      ).rejects.toBeInstanceOf(TotpAlreadyEnrolledError);
    });

    it('refuses a verification challenge for enrolment', async () => {
      const account = addAccount();
      await enrol(account);
      const { challengeToken } = await service.login(account.email, PASSWORD);

      await expect(
        service.startEnrolment(challengeToken),
      ).rejects.toBeInstanceOf(InvalidChallengeError);
    });
  });

  describe('verify', () => {
    it('opens a session on the right code', async () => {
      const account = addAccount();
      const { secret } = await enrol(account);
      const { challengeToken } = await service.login(account.email, PASSWORD);

      const opened = await service.verify(
        challengeToken,
        codeAt(secret),
        client,
      );

      expect(opened.sessionToken).toEqual(expect.any(String));
      expect(
        await accounts.listActiveSessions(account.userId, clock.now()),
      ).toHaveLength(2);
    });

    it('clears the count of wrong codes on success', async () => {
      const account = addAccount();
      const { secret } = await enrol(account);
      const { challengeToken } = await service.login(account.email, PASSWORD);
      await expect(
        service.verify(challengeToken, '000000', client),
      ).rejects.toBeInstanceOf(InvalidTotpCodeError);

      await service.verify(challengeToken, codeAt(secret), client);

      expect((await totpStates.findState(account.userId))?.failedAttempts).toBe(
        0,
      );
    });

    it('refuses an expired challenge', async () => {
      const account = addAccount();
      const { secret } = await enrol(account);
      const { challengeToken } = await service.login(account.email, PASSWORD);

      clock.advance(6 * MINUTE_MS);

      await expect(
        service.verify(challengeToken, codeAt(secret), client),
      ).rejects.toBeInstanceOf(InvalidChallengeError);
    });

    it('checks the account again: deactivated since the password', async () => {
      const account = addAccount();
      const { secret } = await enrol(account);
      const { challengeToken } = await service.login(account.email, PASSWORD);
      accounts.addAccount({
        ...account,
        status: UserStatus.DEACTIVATED,
        passwordHash,
      });

      await expect(
        service.verify(challengeToken, codeAt(secret), client),
      ).rejects.toBeInstanceOf(AccountDeactivatedError);
    });
  });

  describe('recover', () => {
    it('opens a session with a recovery code, usable once', async () => {
      const account = addAccount();
      const { recoveryCodes } = await enrol(account);
      const code = recoveryCodes[0] ?? '';

      const first = await service.login(account.email, PASSWORD);
      const opened = await service.recover(first.challengeToken, code, client);

      expect(opened.remainingRecoveryCodes).toBe(9);
      expect(audit.rows.at(-1)).toMatchObject({
        action: AuditAction.RECOVERY_CODE_USED,
        targetId: account.userId,
      });

      const second = await service.login(account.email, PASSWORD);
      await expect(
        service.recover(second.challengeToken, code, client),
      ).rejects.toBeInstanceOf(InvalidTotpCodeError);
    });
  });

  describe('reset', () => {
    it('erases the factor, closes the back office sessions only, and audits', async () => {
      const superAdmin = addAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      });
      const account = addAccount();
      await enrol(account);
      await accounts.createSession({
        userId: account.userId,
        channel: SessionChannel.MOBILE,
        refreshTokenHash: Buffer.from(randomUUID()),
        deviceId: randomUUID(),
        deviceName: 'iPhone',
        platform: DevicePlatform.IOS,
        appVersion: '1.0.0',
        createdAt: clock.now(),
        expiresAt: new Date(clock.now().getTime() + 30 * DAY_MS),
      });

      await service.reset(actor(superAdmin), account.userId, client);

      const sessions = await accounts.listActiveSessions(
        account.userId,
        clock.now(),
      );
      expect(sessions.map((session) => session.channel)).toEqual([
        SessionChannel.MOBILE,
      ]);
      expect((await service.login(account.email, PASSWORD)).step).toBe(
        AuthStep.TOTP_ENROLMENT,
      );
      expect(audit.rows.at(-1)).toMatchObject({
        action: AuditAction.TOTP_RESET,
        actorUserId: superAdmin.userId,
        actorRole: UserRole.SUPER_ADMIN,
        targetId: account.userId,
        establishmentId: ESTABLISHMENT_ID,
        ipAddress: client.ipAddress,
      });
    });

    it('answers USER_NOT_FOUND for an unknown user', async () => {
      const superAdmin = addAccount({
        role: UserRole.SUPER_ADMIN,
        establishment: null,
        subscription: null,
      });

      await expect(
        service.reset(actor(superAdmin), randomUUID(), client),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });
  });
});
