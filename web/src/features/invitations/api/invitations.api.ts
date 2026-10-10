import 'server-only';
import type { ApiSchemas } from '@core/api/api-types';
import { serverApi } from '@core/api/server-api';

export type Invitation = ApiSchemas['InvitationResponseDto'];

// The token travels in request bodies only, never in a URL.
export async function lookupInvitation(token: string): Promise<Invitation> {
  return (
    await serverApi.request<Invitation>('/invitations/lookup', {
      method: 'POST',
      body: { token },
    })
  ).data;
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<void> {
  await serverApi.request('/invitations/acceptance', {
    method: 'POST',
    body: { token, password },
  });
}
