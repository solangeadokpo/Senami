import { BusinessRuleError } from '@shared/errors/domain.error.js';
import type { RecipientList } from './recipient-list.enum.js';

/** MOB-07, RG-03: without a main recipient, the establishment cannot declare. */
export class NoPrimaryRecipientError extends BusinessRuleError {
  readonly code = 'NO_PRIMARY_RECIPIENT';
  constructor() {
    super('At least one main recipient is required');
  }
}

/** Names the second occurrence; the email stays out of the body and the logs. */
export class RecipientEmailDuplicatedError extends BusinessRuleError {
  readonly code = 'RECIPIENT_EMAIL_DUPLICATED';
  constructor(list: RecipientList, index: number) {
    super('The same email appears twice among the recipients', {
      details: { list, index },
    });
  }
}
