/**
 * Opaque handle of a running transaction. A service passes it on to the
 * repositories without knowing what it holds.
 */
export interface TransactionScope {
  readonly kind: 'transaction-scope';
}

/** Runs several repository calls in one transaction. */
export interface UnitOfWork {
  run<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
