import { randomUUID } from 'node:crypto';
import type {
  StoredRecoveryCode,
  TotpRepository,
  TotpState,
} from './totp.repository.js';

interface FakeRecoveryCode extends StoredRecoveryCode {
  userId: string;
  usedAt: Date | null;
}

export class FakeTotpRepository implements TotpRepository {
  readonly states = new Map<string, TotpState>();
  readonly recoveryCodes: FakeRecoveryCode[] = [];

  addUser(userId: string, email: string): TotpState {
    const state: TotpState = {
      userId,
      email,
      secretEncrypted: null,
      enrolledAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    };
    this.states.set(userId, state);
    return state;
  }

  findState(userId: string) {
    const state = this.states.get(userId);
    return Promise.resolve(state === undefined ? undefined : { ...state });
  }

  storePendingSecret(userId: string, secretEncrypted: Buffer) {
    this.update(userId, { secretEncrypted, enrolledAt: null });
    return Promise.resolve();
  }

  confirmEnrolment(userId: string, at: Date, recoveryCodeHashes: string[]) {
    this.update(userId, {
      enrolledAt: at,
      failedAttempts: 0,
      lockedUntil: null,
    });
    this.removeCodes(userId);
    for (const codeHash of recoveryCodeHashes) {
      this.recoveryCodes.push({
        id: randomUUID(),
        userId,
        codeHash,
        usedAt: null,
      });
    }
    return Promise.resolve();
  }

  recordFailure(userId: string) {
    const state = this.mustGet(userId);
    state.failedAttempts += 1;
    return Promise.resolve(state.failedAttempts);
  }

  lock(userId: string, until: Date) {
    this.update(userId, { lockedUntil: until, failedAttempts: 0 });
    return Promise.resolve();
  }

  clearFailures(userId: string) {
    this.update(userId, { failedAttempts: 0, lockedUntil: null });
    return Promise.resolve();
  }

  listUnusedRecoveryCodes(userId: string) {
    return Promise.resolve(
      this.recoveryCodes
        .filter((code) => code.userId === userId && code.usedAt === null)
        .map(({ id, codeHash }) => ({ id, codeHash })),
    );
  }

  useRecoveryCode(id: string, at: Date) {
    const code = this.recoveryCodes.find((candidate) => candidate.id === id);
    if (code === undefined || code.usedAt !== null)
      return Promise.resolve(false);
    code.usedAt = at;
    return Promise.resolve(true);
  }

  reset(userId: string) {
    this.update(userId, {
      secretEncrypted: null,
      enrolledAt: null,
      failedAttempts: 0,
      lockedUntil: null,
    });
    this.removeCodes(userId);
    return Promise.resolve();
  }

  private removeCodes(userId: string): void {
    for (let index = this.recoveryCodes.length - 1; index >= 0; index--) {
      if (this.recoveryCodes[index]?.userId === userId) {
        this.recoveryCodes.splice(index, 1);
      }
    }
  }

  private update(userId: string, changes: Partial<TotpState>): void {
    Object.assign(this.mustGet(userId), changes);
  }

  private mustGet(userId: string): TotpState {
    const state = this.states.get(userId);
    if (state === undefined) throw new Error(`unknown user ${userId}`);
    return state;
  }
}
