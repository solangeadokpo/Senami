import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '@shared/errors/domain.error.js';

/** Unknown, or already used: the same answer, so a token cannot be probed. */
export class InvitationInvalidError extends NotFoundError {
  readonly code = 'INVITATION_INVALID';
  constructor() {
    super('Invitation not found or already used');
  }
}

/** Expired or replaced by a newer one: ask for a new link. */
export class InvitationExpiredError extends BusinessRuleError {
  readonly code = 'INVITATION_EXPIRED';
  constructor() {
    super('Invitation expired');
  }
}

export class UserAlreadyActiveError extends ConflictError {
  readonly code = 'USER_ALREADY_ACTIVE';
  constructor(userId: string) {
    super('The user has already accepted their invitation', {
      details: { userId },
    });
  }
}
