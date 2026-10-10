import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DRIZZLE,
  type Database,
  DrizzleTransactionScope,
  type Transaction,
  enterTenant,
  withTenant,
} from '@core/database/index.js';
import { sheetRecipients } from '@database/schema/index.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type {
  RecipientLists,
  SheetRecipients,
  SheetRecipientsRepository,
} from './sheet-recipients.repository.js';

const COLUMNS = {
  to: sheetRecipients.toEmails,
  cc: sheetRecipients.ccEmails,
  bcc: sheetRecipients.bccEmails,
  updatedAt: sheetRecipients.updatedAt,
};

@Injectable()
export class DrizzleSheetRecipientsRepository implements SheetRecipientsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async find(establishmentId: string): Promise<SheetRecipients | undefined> {
    const [row] = await withTenant(this.db, establishmentId, (tx) =>
      tx
        .select(COLUMNS)
        .from(sheetRecipients)
        .where(eq(sheetRecipients.establishmentId, establishmentId)),
    );
    return row;
  }

  save(
    establishmentId: string,
    lists: RecipientLists,
    at: Date,
    scope: TransactionScope,
  ): Promise<SheetRecipients> {
    return this.inTenant(establishmentId, scope, async (tx) => {
      const values = {
        toEmails: lists.to,
        ccEmails: lists.cc,
        bccEmails: lists.bcc,
        updatedAt: at,
      };
      const [row] = await tx
        .insert(sheetRecipients)
        .values({ establishmentId, ...values })
        .onConflictDoUpdate({
          target: sheetRecipients.establishmentId,
          set: values,
        })
        .returning(COLUMNS);
      if (row === undefined) throw new Error('Sheet recipients not saved');
      return row;
    });
  }

  /** In the unit of work's transaction, scoped to the establishment. */
  private async inTenant<T>(
    establishmentId: string,
    scope: TransactionScope,
    work: (tx: Transaction) => Promise<T>,
  ): Promise<T> {
    if (!(scope instanceof DrizzleTransactionScope)) {
      return withTenant(this.db, establishmentId, work);
    }
    await enterTenant(scope.tx, establishmentId);
    return work(scope.tx);
  }
}
