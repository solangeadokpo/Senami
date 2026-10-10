import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  UnavailableError,
} from '@shared/errors/domain.error.js';

/** Also the answer to a responsable asking for another establishment. */
export class EstablishmentNotFoundError extends NotFoundError {
  readonly code = 'ESTABLISHMENT_NOT_FOUND';
  constructor(establishmentId: string) {
    super('Establishment not found', { details: { establishmentId } });
  }
}

export class EstablishmentAlreadySuspendedError extends ConflictError {
  readonly code = 'ESTABLISHMENT_ALREADY_SUSPENDED';
  constructor() {
    super('The establishment is already suspended');
  }
}

export class EstablishmentNotSuspendedError extends ConflictError {
  readonly code = 'ESTABLISHMENT_NOT_SUSPENDED';
  constructor() {
    super('The establishment is not suspended');
  }
}

export class UserEmailAlreadyUsedError extends ConflictError {
  readonly code = 'USER_EMAIL_ALREADY_USED';
  constructor() {
    super('This email address already belongs to an account');
  }
}

/** Configuration error: no plan has a price in force today. */
export class NoCurrentPlanPriceError extends UnavailableError {
  readonly code = 'NO_CURRENT_PLAN_PRICE';
  constructor() {
    super('No subscription price applies today');
  }
}

export class LogoTypeNotAllowedError extends BusinessRuleError {
  readonly code = 'LOGO_TYPE_NOT_ALLOWED';
  constructor() {
    super('The logo must be a PNG or an SVG image');
  }
}

export class LogoInvalidError extends BusinessRuleError {
  readonly code = 'LOGO_INVALID';
  constructor() {
    super('The logo could not be read');
  }
}

export class LogoNotFoundError extends NotFoundError {
  readonly code = 'LOGO_NOT_FOUND';
  constructor() {
    super('The establishment has no logo');
  }
}
