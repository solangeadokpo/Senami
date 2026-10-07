import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';

export interface TotpState {
  userId: string;
  email: string;
  secretEncrypted: Buffer | null;
  /** null: not enrolled, or enrolment started and not confirmed. */
  enrolledAt: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
}

export interface StoredRecoveryCode {
  id: string;
  codeHash: string;
}

export interface TotpRepository {
  findState(
    userId: string,
    scope?: TransactionScope,
  ): Promise<TotpState | undefined>;
  /** Replaces any unconfirmed secret; the factor stays inactive. */
  storePendingSecret(userId: string, secretEncrypted: Buffer): Promise<void>;
  /** Activates the factor and replaces the recovery codes. */
  confirmEnrolment(
    userId: string,
    at: Date,
    recoveryCodeHashes: string[],
    scope?: TransactionScope,
  ): Promise<void>;
  /** Atomic increment, returns the new count. */
  recordFailure(userId: string, scope?: TransactionScope): Promise<number>;
  lock(userId: string, until: Date, scope?: TransactionScope): Promise<void>;
  clearFailures(userId: string, scope?: TransactionScope): Promise<void>;
  listUnusedRecoveryCodes(
    userId: string,
    scope?: TransactionScope,
  ): Promise<StoredRecoveryCode[]>;
  /** false if already used: a code works once even under concurrency. */
  useRecoveryCode(
    id: string,
    at: Date,
    scope?: TransactionScope,
  ): Promise<boolean>;
  /** Erases secret, enrolment, failures, lock and recovery codes. */
  reset(userId: string, scope?: TransactionScope): Promise<void>;
}

export const TOTP_REPOSITORY = Symbol('TOTP_REPOSITORY');
