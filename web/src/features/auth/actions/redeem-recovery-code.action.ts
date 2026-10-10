'use server';

import { type ActionResult, toActionFailure } from '@core/api/action-result';
import { setFlash } from '@core/flash/set-flash';
import { redeemRecoveryCode } from '@features/auth/api/backoffice-auth.api';
import { keepSessionCookie } from '@features/auth/api/session-cookie';
import {
  challengeTokenSchema,
  recoveryCodeSchema,
} from '@features/auth/schemas/sign-in.schema';
import { AuthErrorCode } from '@features/auth/utils/auth-error-messages';

export async function redeemRecoveryCodeAction(
  challengeToken: string,
  recoveryCode: string,
): Promise<ActionResult<object>> {
  if (
    !challengeTokenSchema.safeParse(challengeToken).success ||
    !recoveryCodeSchema.safeParse(recoveryCode).success
  ) {
    return { ok: false, code: AuthErrorCode.VALIDATION_FAILED };
  }

  try {
    const { data, headers } = await redeemRecoveryCode(
      challengeToken,
      recoveryCode,
    );
    await keepSessionCookie(headers);
    await setFlash({
      kind: 'recovery-code-used',
      remaining: data.remainingRecoveryCodes,
    });
  } catch (error) {
    return toActionFailure(error);
  }
  return { ok: true };
}
