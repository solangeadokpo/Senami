'use server';

import { redeemRecoveryCode } from '@features/auth/api/backoffice-auth.api';
import {
  keepSessionCookie,
  setAuthFlash,
} from '@features/auth/api/session-cookie';
import {
  challengeTokenSchema,
  recoveryCodeSchema,
} from '@features/auth/schemas/sign-in.schema';
import {
  type ActionResult,
  toActionFailure,
} from '@features/auth/utils/action-result';
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
    await setAuthFlash({
      kind: 'recovery-code-used',
      remaining: data.remainingRecoveryCodes,
    });
  } catch (error) {
    return toActionFailure(error);
  }
  return { ok: true };
}
