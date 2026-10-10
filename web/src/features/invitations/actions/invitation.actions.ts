'use server';

import { type ActionResult, toActionFailure } from '@core/api/action-result';
import {
  type Invitation,
  acceptInvitation,
  lookupInvitation,
} from '@features/invitations/api/invitations.api';
import { passwordSchema } from '@features/invitations/schemas/password.schema';

const TOKEN = /^[A-Za-z0-9_-]{20,128}$/;

export async function lookupInvitationAction(
  token: string,
): Promise<ActionResult<{ invitation: Invitation }>> {
  if (!TOKEN.test(token)) return { ok: false, code: 'INVITATION_INVALID' };
  try {
    return { ok: true, invitation: await lookupInvitation(token) };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function acceptInvitationAction(
  token: string,
  password: string,
): Promise<ActionResult<object>> {
  if (!TOKEN.test(token)) return { ok: false, code: 'INVITATION_INVALID' };
  if (!passwordSchema.safeParse(password).success)
    return { ok: false, code: 'VALIDATION_FAILED' };
  try {
    await acceptInvitation(token, password);
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}
