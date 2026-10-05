import { DomainErrorMapper } from './domain-error.mapper.js';
import {
  AuthenticationError,
  BusinessRuleError,
  ConflictError,
  ForbiddenActionError,
  NotFoundError,
  UnavailableError,
} from './domain.error.js';

class SessionRevokedError extends AuthenticationError {
  readonly code = 'SESSION_REVOKED';
  constructor() {
    super('Session revoked');
  }
}
class SubscriptionSuspendedError extends ForbiddenActionError {
  readonly code = 'SUBSCRIPTION_SUSPENDED';
  constructor() {
    super('Subscription suspended');
  }
}
class StudentNotFoundError extends NotFoundError {
  readonly code = 'STUDENT_NOT_FOUND';
  constructor(studentId: string) {
    super('Student not found', {
      details: { studentId },
      context: { query: 'by id' },
    });
  }
}
class EmailAlreadyUsedError extends ConflictError {
  readonly code = 'USER_EMAIL_ALREADY_USED';
  constructor() {
    super('Email already used');
  }
}
class NoPrimaryRecipientError extends BusinessRuleError {
  readonly code = 'NO_PRIMARY_RECIPIENT';
  constructor() {
    super('No primary recipient');
  }
}
class EmailProviderUnavailableError extends UnavailableError {
  readonly code = 'EMAIL_PROVIDER_UNAVAILABLE';
  constructor() {
    super('Email provider unavailable');
  }
}

describe('DomainErrorMapper', () => {
  const mapper = new DomainErrorMapper();

  it.each([
    [new SessionRevokedError(), 401],
    [new SubscriptionSuspendedError(), 403],
    [new StudentNotFoundError('s1'), 404],
    [new EmailAlreadyUsedError(), 409],
    [new NoPrimaryRecipientError(), 422],
    [new EmailProviderUnavailableError(), 503],
  ])('maps %s to its family status', (error, status) => {
    expect(mapper.map(error)?.status).toBe(status);
  });

  it('keeps the code, message, details and context of the error', () => {
    expect(mapper.map(new StudentNotFoundError('s1'))).toEqual({
      status: 404,
      code: 'STUDENT_NOT_FOUND',
      message: 'Student not found',
      details: { studentId: 's1' },
      context: { query: 'by id' },
    });
  });

  it('ignores an error that is not a domain error', () => {
    expect(mapper.map(new Error('boom'))).toBeUndefined();
  });
});
