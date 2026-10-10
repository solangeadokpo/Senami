import type {
  TransactionScope,
  UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';

/** Runs the work at once: the fake repositories ignore the scope. */
export class FakeUnitOfWork implements UnitOfWork {
  runs = 0;

  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T> {
    this.runs++;
    return work({ kind: 'transaction-scope' });
  }
}
