import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type Database, executorOf } from '@core/database/index.js';
import { totpRecoveryCodes, users } from '@database/schema/index.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type {
  StoredRecoveryCode,
  TotpRepository,
  TotpState,
} from './totp.repository.js';

@Injectable()
export class DrizzleTotpRepository implements TotpRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findState(
    userId: string,
    scope?: TransactionScope,
  ): Promise<TotpState | undefined> {
    const [row] = await executorOf(this.db, scope)
      .select({
        userId: users.id,
        email: users.email,
        secretEncrypted: users.totpSecretEncrypted,
        enrolledAt: users.totpEnrolledAt,
        failedAttempts: users.totpFailedAttempts,
        lockedUntil: users.totpLockedUntil,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row;
  }

  async storePendingSecret(
    userId: string,
    secretEncrypted: Buffer,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ totpSecretEncrypted: secretEncrypted, totpEnrolledAt: null })
      .where(eq(users.id, userId));
  }

  async confirmEnrolment(
    userId: string,
    at: Date,
    recoveryCodeHashes: string[],
    scope?: TransactionScope,
  ): Promise<void> {
    const executor = executorOf(this.db, scope);
    await executor
      .update(users)
      .set({ totpEnrolledAt: at, totpFailedAttempts: 0, totpLockedUntil: null })
      .where(eq(users.id, userId));
    await executor
      .delete(totpRecoveryCodes)
      .where(eq(totpRecoveryCodes.userId, userId));
    await executor
      .insert(totpRecoveryCodes)
      .values(recoveryCodeHashes.map((codeHash) => ({ userId, codeHash })));
  }

  async recordFailure(
    userId: string,
    scope?: TransactionScope,
  ): Promise<number> {
    const [row] = await executorOf(this.db, scope)
      .update(users)
      .set({ totpFailedAttempts: sql`${users.totpFailedAttempts} + 1` })
      .where(eq(users.id, userId))
      .returning({ failedAttempts: users.totpFailedAttempts });
    return row?.failedAttempts ?? 0;
  }

  async lock(
    userId: string,
    until: Date,
    scope?: TransactionScope,
  ): Promise<void> {
    await executorOf(this.db, scope)
      .update(users)
      .set({ totpLockedUntil: until, totpFailedAttempts: 0 })
      .where(eq(users.id, userId));
  }

  async clearFailures(userId: string, scope?: TransactionScope): Promise<void> {
    await executorOf(this.db, scope)
      .update(users)
      .set({ totpFailedAttempts: 0, totpLockedUntil: null })
      .where(eq(users.id, userId));
  }

  async listUnusedRecoveryCodes(
    userId: string,
    scope?: TransactionScope,
  ): Promise<StoredRecoveryCode[]> {
    return executorOf(this.db, scope)
      .select({
        id: totpRecoveryCodes.id,
        codeHash: totpRecoveryCodes.codeHash,
      })
      .from(totpRecoveryCodes)
      .where(
        and(
          eq(totpRecoveryCodes.userId, userId),
          isNull(totpRecoveryCodes.usedAt),
        ),
      );
  }

  async useRecoveryCode(
    id: string,
    at: Date,
    scope?: TransactionScope,
  ): Promise<boolean> {
    const used = await executorOf(this.db, scope)
      .update(totpRecoveryCodes)
      .set({ usedAt: at })
      .where(
        and(eq(totpRecoveryCodes.id, id), isNull(totpRecoveryCodes.usedAt)),
      )
      .returning({ id: totpRecoveryCodes.id });
    return used.length > 0;
  }

  async reset(userId: string, scope?: TransactionScope): Promise<void> {
    const executor = executorOf(this.db, scope);
    await executor
      .update(users)
      .set({
        totpSecretEncrypted: null,
        totpEnrolledAt: null,
        totpFailedAttempts: 0,
        totpLockedUntil: null,
      })
      .where(eq(users.id, userId));
    await executor
      .delete(totpRecoveryCodes)
      .where(eq(totpRecoveryCodes.userId, userId));
  }
}
