import { Secret, TOTP } from 'otpauth';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import {
  InvalidTotpCodeError,
  TotpLockedError,
} from '@modules/auth/auth.errors.js';
import { FakeTotpRepository } from '@modules/auth/repositories/totp.repository.fake.js';
import type { TotpState } from '@modules/auth/repositories/totp.repository.js';
import { TEST_AUTH_CONFIG } from '@modules/auth/testing/auth-fixtures.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { FakeClock, MINUTE_MS } from '@shared/testing/fake-clock.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { SecretCipherService } from './secret-cipher.service.js';
import {
  type AuditTarget,
  TotpService,
  normaliseRecoveryCode,
} from './totp.service.js';

const USER_ID = 'u1';
const target: AuditTarget = {
  userId: USER_ID,
  establishmentId: 'e1',
  client: { ipAddress: '203.0.113.7', userAgent: 'Firefox' },
};

describe('TotpService', () => {
  let clock: FakeClock;
  let repository: FakeTotpRepository;
  let audit: FakeAuditRepository;
  let service: TotpService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeTotpRepository();
    audit = new FakeAuditRepository();
    repository.addUser(USER_ID, 'lea@ecole.test');
    service = new TotpService(
      repository,
      new SecretCipherService(TEST_AUTH_CONFIG),
      new PasswordHasherService(),
      new AuditService(audit, clock),
      clock,
      new FakeUnitOfWork(),
    );
  });

  async function state(): Promise<TotpState> {
    const found = await repository.findState(USER_ID);
    if (found === undefined) throw new Error('no state');
    return found;
  }

  async function enrol(): Promise<string> {
    const { secret } = await service.startEnrolment(await state());
    return secret;
  }

  function codeAt(secret: string, at: Date): string {
    return new TOTP({ secret: Secret.fromBase32(secret) }).generate({
      timestamp: at.getTime(),
    });
  }

  describe('startEnrolment', () => {
    it('stores the secret encrypted and gives the otpauth URL', async () => {
      const { secret, otpauthUrl } = await service.startEnrolment(
        await state(),
      );

      const stored = (await state()).secretEncrypted;
      expect(stored).not.toBeNull();
      expect(stored?.toString('utf8')).not.toContain(secret);
      expect(otpauthUrl).toMatch(
        /^otpauth:\/\/totp\/Senami:lea%40ecole\.test\?/,
      );
      expect(otpauthUrl).toContain(`secret=${secret}`);
      expect((await state()).enrolledAt).toBeNull();
    });
  });

  describe('checkCode', () => {
    it('accepts the current code, the previous and the next one', async () => {
      const secret = await enrol();

      for (const offset of [0, -30_000, 30_000]) {
        await service.checkCode(
          await state(),
          codeAt(secret, new Date(clock.now().getTime() + offset)),
          target,
        );
      }

      expect((await state()).failedAttempts).toBe(0);
    });

    it('refuses a code from two periods ago and counts the failure', async () => {
      const secret = await enrol();
      const old = codeAt(secret, new Date(clock.now().getTime() - 90_000));

      await expect(
        service.checkCode(await state(), old, target),
      ).rejects.toBeInstanceOf(InvalidTotpCodeError);
      expect((await state()).failedAttempts).toBe(1);
    });

    it('locks for 15 minutes on the fifth failure, and audits it', async () => {
      await enrol();
      for (let attempt = 1; attempt < 5; attempt++) {
        await expect(
          service.checkCode(await state(), '000000', target),
        ).rejects.toBeInstanceOf(InvalidTotpCodeError);
      }

      const error = await service
        .checkCode(await state(), '000000', target)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(TotpLockedError);
      const lockedUntil = new Date(clock.now().getTime() + 15 * MINUTE_MS);
      expect((await state()).lockedUntil).toEqual(lockedUntil);
      expect(audit.rows).toEqual([
        expect.objectContaining({
          action: AuditAction.TOTP_LOCKED,
          actorUserId: null,
          targetId: USER_ID,
          establishmentId: 'e1',
          details: { lockedUntil: lockedUntil.toISOString() },
          ipAddress: '203.0.113.7',
        }),
      ]);
    });

    it('refuses even a right code while locked, then accepts it', async () => {
      const secret = await enrol();
      await repository.lock(
        USER_ID,
        new Date(clock.now().getTime() + 15 * MINUTE_MS),
      );

      await expect(
        service.checkCode(await state(), codeAt(secret, clock.now()), target),
      ).rejects.toBeInstanceOf(TotpLockedError);

      clock.advance(15 * MINUTE_MS + 1);
      await service.checkCode(
        await state(),
        codeAt(secret, clock.now()),
        target,
      );
    });
  });

  describe('recovery codes', () => {
    it('generates ten distinct readable codes and their hashes', async () => {
      const { codes, hashes } = await service.generateRecoveryCodes();

      expect(codes).toHaveLength(10);
      expect(new Set(codes).size).toBe(10);
      for (const code of codes) {
        expect(code).toMatch(/^[A-HJKMNP-TV-Z2-9]{5}-[A-HJKMNP-TV-Z2-9]{5}$/);
      }
      expect(hashes).toHaveLength(10);
      expect(hashes.join()).not.toContain(
        normaliseRecoveryCode(codes[0] ?? ''),
      );
    });

    it('finds the stored code, whatever the case and separators', async () => {
      const { codes, hashes } = await service.generateRecoveryCodes();
      await repository.confirmEnrolment(USER_ID, clock.now(), hashes);
      const code = codes[3] ?? '';

      const stored = await service.checkRecoveryCode(
        await state(),
        ` ${code.toLowerCase().replace('-', ' ')} `,
        target,
      );

      const unused = await repository.listUnusedRecoveryCodes(USER_ID);
      expect(unused[3]?.id).toBe(stored.id);
    });

    it('counts an unknown code as a failure', async () => {
      const { hashes } = await service.generateRecoveryCodes();
      await repository.confirmEnrolment(USER_ID, clock.now(), hashes);

      await expect(
        service.checkRecoveryCode(await state(), 'AAAAA-AAAAA', target),
      ).rejects.toBeInstanceOf(InvalidTotpCodeError);
      expect((await state()).failedAttempts).toBe(1);
    });
  });
});
