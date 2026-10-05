export interface DomainErrorOptions {
  /** Returned to the client: parameters it can use to build its own message. */
  details?: Record<string, unknown>;
  /** Logged only, never returned. */
  context?: Record<string, unknown>;
  cause?: unknown;
}

/**
 * A business situation, not an HTTP status: AllExceptionsFilter translates
 * the family into a status. Modules extend a family, never this class.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  readonly context: Record<string, unknown> | undefined;

  protected constructor(message: string, options: DomainErrorOptions = {}) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = new.target.name;
    this.details = options.details;
    this.context = options.context;
  }
}

/** 401: the caller has not proved who they are. */
export abstract class AuthenticationError extends DomainError {}

/** 403: the caller is known, and the answer is no. */
export abstract class ForbiddenActionError extends DomainError {}

export abstract class NotFoundError extends DomainError {}

/** 409: conflicts with the current state of the data. */
export abstract class ConflictError extends DomainError {}

/** 422: a well-formed request that a business rule refuses. */
export abstract class BusinessRuleError extends DomainError {}

/** 503: valid, but cannot be served right now (an upstream is down). */
export abstract class UnavailableError extends DomainError {}
