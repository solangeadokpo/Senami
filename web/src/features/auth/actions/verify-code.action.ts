'use server';

import { type ActionResult, toActionFailure } from '@core/api/action-result';
import { setFlash } from '@core/flash/set-flash';
import { verifyCode } from '@features/auth/api/backoffice-auth.api';
import { keepSessionCookie } from '@features/auth/api/session-cookie';
import {
  challengeTokenSchema,
  totpCodeSchema,
} from '@features/auth/schemas/sign-in.schema';
import { AuthErrorCode } from '@features/auth/utils/auth-error-messages';

/** Opens the session; the page then goes to the back office. */
export async function verifyCodeAction(
  challengeToken: string,
  code: string,
): Promise<ActionResult<object>> {
  if (
    !challengeTokenSchema.safeParse(challengeToken).success ||
    !totpCodeSchema.safeParse(code).success
  ) {
    return { ok: false, code: AuthErrorCode.VALIDATION_FAILED };
  }

  try {
    const { headers } = await verifyCode(challengeToken, code);
    const sessionExpiresAt = await keepSessionCookie(headers);
    await setFlash({
      kind: 'signed-in',
      sessionExpiresAt: sessionExpiresAt?.toISOString() ?? null,
    });
  } catch (error) {
    return toActionFailure(error);
  }
  return { ok: true };
}
