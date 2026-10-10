import {
  AuthenticationError,
  ConflictError,
  ForbiddenActionError,
  NotFoundError,
} from '@shared/errors/domain.error.js';

export class UnauthenticatedError extends AuthenticationError {
  readonly code = 'UNAUTHENTICATED';
  constructor() {
    super('Authentication required');
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid credentials');
  }
}

export class AccountNotActivatedError extends AuthenticationError {
  readonly code = 'ACCOUNT_NOT_ACTIVATED';
  constructor() {
    super('Account not activated');
  }
}

export class AccountDeactivatedError extends AuthenticationError {
  readonly code = 'ACCOUNT_DEACTIVATED';
  constructor() {
    super('Account deactivated');
  }
}

export class SessionRevokedError extends AuthenticationError {
  readonly code = 'SESSION_REVOKED';
  constructor() {
    super('Session revoked');
  }
}

export class SessionExpiredError extends AuthenticationError {
  readonly code = 'SESSION_EXPIRED';
  constructor() {
    super('Session expired');
  }
}

export class InvalidRefreshTokenError extends AuthenticationError {
  readonly code = 'INVALID_REFRESH_TOKEN';
  constructor() {
    super('Invalid refresh token');
  }
}

export class RefreshTokenReusedError extends AuthenticationError {
  readonly code = 'REFRESH_TOKEN_REUSED';
  constructor(sessionId: string) {
    super('Refresh token already used, session revoked', {
      context: { sessionId },
    });
  }
}

export class ChannelNotAllowedError extends ForbiddenActionError {
  readonly code = 'CHANNEL_NOT_ALLOWED';
  constructor() {
    super('This account cannot use this application');
  }
}

export class EstablishmentSuspendedError extends ForbiddenActionError {
  readonly code = 'ESTABLISHMENT_SUSPENDED';
  constructor() {
    super('Establishment suspended');
  }
}

export class SubscriptionSuspendedError extends ForbiddenActionError {
  readonly code = 'SUBSCRIPTION_SUSPENDED';
  constructor() {
    super('Subscription suspended');
  }
}

export class RoleNotAllowedError extends ForbiddenActionError {
  readonly code = 'ROLE_NOT_ALLOWED';
  constructor() {
    super('Role not allowed');
  }
}

export class OriginNotAllowedError extends ForbiddenActionError {
  readonly code = 'ORIGIN_NOT_ALLOWED';
  constructor() {
    super('Origin not allowed');
  }
}

export class SessionNotFoundError extends NotFoundError {
  readonly code = 'SESSION_NOT_FOUND';
  constructor(sessionId: string) {
    super('Session not found', { details: { sessionId } });
  }
}

export class UserNotFoundError extends NotFoundError {
  readonly code = 'USER_NOT_FOUND';
  constructor(userId: string) {
    super('User not found', { details: { userId } });
  }
}

export class InvalidChallengeError extends AuthenticationError {
  readonly code = 'INVALID_CHALLENGE';
  constructor() {
    super('Invalid or expired sign-in challenge');
  }
}

export class InvalidTotpCodeError extends AuthenticationError {
  readonly code = 'INVALID_TOTP_CODE';
  constructor() {
    super('Invalid code');
  }
}

export class TotpLockedError extends ForbiddenActionError {
  readonly code = 'TOTP_LOCKED';
  constructor(lockedUntil: Date) {
    super('Too many wrong codes, try again later', {
      details: { lockedUntil: lockedUntil.toISOString() },
    });
  }
}

export class TotpAlreadyEnrolledError extends ConflictError {
  readonly code = 'TOTP_ALREADY_ENROLLED';
  constructor() {
    super('Second factor already enrolled');
  }
}

export class TotpNotEnrolledError extends ConflictError {
  readonly code = 'TOTP_NOT_ENROLLED';
  constructor() {
    super('Second factor not enrolled');
  }
}

export class TotpEnrolmentNotStartedError extends ConflictError {
  readonly code = 'TOTP_ENROLMENT_NOT_STARTED';
  constructor() {
    super('Second factor enrolment not started');
  }
}
