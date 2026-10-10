import type {
  RecipientLists,
  SheetRecipients,
  SheetRecipientsRepository,
} from './sheet-recipients.repository.js';

export class FakeSheetRecipientsRepository implements SheetRecipientsRepository {
  readonly rows = new Map<string, SheetRecipients>();
  saves = 0;

  find(establishmentId: string): Promise<SheetRecipients | undefined> {
    const row = this.rows.get(establishmentId);
    return Promise.resolve(row === undefined ? undefined : copy(row));
  }

  save(
    establishmentId: string,
    lists: RecipientLists,
    at: Date,
  ): Promise<SheetRecipients> {
    this.saves++;
    const row = copy({ ...lists, updatedAt: at });
    this.rows.set(establishmentId, row);
    return Promise.resolve(copy(row));
  }
}

function copy(row: SheetRecipients): SheetRecipients {
  return {
    to: [...row.to],
    cc: [...row.cc],
    bcc: [...row.bcc],
    updatedAt: row.updatedAt,
  };
}
