import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';

export interface RecipientLists {
  to: string[];
  cc: string[];
  bcc: string[];
}

export interface SheetRecipients extends RecipientLists {
  updatedAt: Date;
}

/** One row per establishment, under row level security. */
export interface SheetRecipientsRepository {
  find(establishmentId: string): Promise<SheetRecipients | undefined>;
  /** Inserts the row, or replaces its lists. */
  save(
    establishmentId: string,
    lists: RecipientLists,
    at: Date,
    scope: TransactionScope,
  ): Promise<SheetRecipients>;
}

export const SHEET_RECIPIENTS_REPOSITORY = Symbol(
  'SHEET_RECIPIENTS_REPOSITORY',
);
