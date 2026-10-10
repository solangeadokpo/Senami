'use server';

import { type ActionResult, toActionFailure } from '@core/api/action-result';
import {
  type SheetRecipients,
  updateSheetRecipients,
} from '@features/sheet-recipients/api/sheet-recipients.api';
import {
  type RecipientsValues,
  recipientsSchema,
} from '@features/sheet-recipients/schemas/sheet-recipients.schema';

/** ETB-03: replaces the three lists of recipients. */
export async function updateSheetRecipientsAction(
  values: RecipientsValues,
): Promise<ActionResult<{ recipients: SheetRecipients }>> {
  const parsed = recipientsSchema.safeParse(values);
  if (!parsed.success) return { ok: false, code: 'VALIDATION_FAILED' };
  try {
    return { ok: true, recipients: await updateSheetRecipients(parsed.data) };
  } catch (error) {
    return toActionFailure(error);
  }
}
