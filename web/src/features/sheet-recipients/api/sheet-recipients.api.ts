import 'server-only';
import type { ApiSchemas } from '@core/api/api-types';
import { serverApi } from '@core/api/server-api';

export type SheetRecipients = ApiSchemas['SheetRecipientsResponseDto'];

/** The lists of the signed-in user's establishment. */
export async function getSheetRecipients(): Promise<SheetRecipients> {
  return (await serverApi.request<SheetRecipients>('/sheet-recipients')).data;
}

export async function updateSheetRecipients(
  body: ApiSchemas['UpdateSheetRecipientsDto'],
): Promise<SheetRecipients> {
  return (
    await serverApi.request<SheetRecipients>('/sheet-recipients', {
      method: 'PUT',
      body,
    })
  ).data;
}
