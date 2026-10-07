import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Secret, TOTP } from 'otpauth';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  type TransactionScope,
  UNIT_OF_WORK,
  type UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';
import {
  InvalidTotpCodeError,
  TotpLockedError,
} from '@modules/auth/auth.errors.js';
import {
  type StoredRecoveryCode,
  TOTP_REPOSITORY,
  type TotpRepository,
  type TotpState,
} from '@modules/auth/repositories/totp.repository.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { SecretCipherService } from './secret-cipher.service.js';

const ISSUER = 'Senami';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
const RECOVERY_CODE_COUNT = 10;
// No 0/O, 1/I/L, U: a code read from paper must not be ambiguous.
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const RECOVERY_HALF_LENGTH = 5;

/** RFC 6238: SHA-1, 6 digits, 30 seconds, one period of tolerance each side. */
@Injectable()
export class TotpService {
  constructor(
    @Inject(TOTP_REPOSITORY) private readonly repository: TotpRepository,
    private readonly cipher: SecretCipherService,
    private readonly passwords: PasswordHasherService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async startEnrolment(
    state: TotpState,
  ): Promise<{ otpauthUrl: string; secret: string }> {
    const secret = new Secret({ size: 20 });
    await this.repository.storePendingSecret(
      state.userId,
      this.cipher.encrypt(secret.base32),
    );
    return {
      otpauthUrl: this.totp(state.email, secret).toString(),
      secret: secret.base32,
    };
  }

  assertNotLocked(state: TotpState): void {
    if (state.lockedUntil !== null && state.lockedUntil > this.clock.now()) {
      throw new TotpLockedError(state.lockedUntil);
    }
  }

  /** Throws InvalidTotpCodeError, or TotpLockedError on the fifth failure. */
  async checkCode(
    state: TotpState,
    code: string,
    audit: AuditTarget,
  ): Promise<void> {
    this.assertNotLocked(state);
    if (state.secretEncrypted === null) {
      await this.registerFailure(state, audit);
      return;
    }
    const secret = Secret.fromBase32(
      this.cipher.decrypt(state.secretEncrypted),
    );
    const delta = this.totp(state.email, secret).validate({
      token: code,
      timestamp: this.clock.now().getTime(),
      window: 1,
    });
    if (delta === null) await this.registerFailure(state, audit);
  }

  /** The matching unused code, or a failure counted like a wrong TOTP. */
  async checkRecoveryCode(
    state: TotpState,
    recoveryCode: string,
    audit: AuditTarget,
  ): Promise<StoredRecoveryCode> {
    this.assertNotLocked(state);
    const normalised = normaliseRecoveryCode(recoveryCode);
    for (const stored of await this.repository.listUnusedRecoveryCodes(
      state.userId,
    )) {
      if (await this.passwords.verify(stored.codeHash, normalised)) {
        return stored;
      }
    }
    return this.registerFailure(state, audit);
  }

  /** Clear codes for the user, hashes for the database. */
  async generateRecoveryCodes(): Promise<{
    codes: string[];
    hashes: string[];
  }> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      [randomGroup(), randomGroup()].join('-'),
    );
    const hashes = await Promise.all(
      codes.map((code) => this.passwords.hash(normaliseRecoveryCode(code))),
    );
    return { codes, hashes };
  }

  private async registerFailure(
    state: TotpState,
    target: AuditTarget,
  ): Promise<never> {
    const lockedUntil = await this.unitOfWork.run(async (scope) => {
      const attempts = await this.repository.recordFailure(state.userId, scope);
      if (attempts < MAX_FAILED_ATTEMPTS) return undefined;

      const until = new Date(this.clock.now().getTime() + LOCK_MS);
      await this.repository.lock(state.userId, until, scope);
      await this.recordLock(target, until, scope);
      return until;
    });
    if (lockedUntil !== undefined) throw new TotpLockedError(lockedUntil);
    throw new InvalidTotpCodeError();
  }

  private recordLock(
    target: AuditTarget,
    until: Date,
    scope: TransactionScope,
  ): Promise<void> {
    return this.audit.record(
      {
        action: AuditAction.TOTP_LOCKED,
        actor: null,
        target: { type: 'user', id: target.userId },
        establishmentId: target.establishmentId,
        details: { lockedUntil: until.toISOString() },
        client: target.client,
      },
      scope,
    );
  }

  private totp(email: string, secret: Secret): TOTP {
    return new TOTP({
      issuer: ISSUER,
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret,
    });
  }
}

export interface AuditTarget {
  userId: string;
  establishmentId: string | null;
  client: ClientDetails;
}

export function normaliseRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomGroup(): string {
  return Array.from(
    { length: RECOVERY_HALF_LENGTH },
    () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)],
  ).join('');
}
