'use server';

import { confirmEnrolment } from '@features/auth/api/backoffice-auth.api';
import { holdPendingSession } from '@features/auth/api/session-cookie';
import {
  challengeTokenSchema,
  totpCodeSchema,
} from '@features/auth/schemas/sign-in.schema';
import {
  type ActionResult,
  toActionFailure,
} from '@features/auth/utils/action-result';
import { AuthErrorCode } from '@features/auth/utils/auth-error-messages';

/**
 * Opens the session, held pending until the recovery codes are acknowledged
 * (finishEnrolmentAction).
 */
export async function confirmEnrolmentAction(
  challengeToken: string,
  code: string,
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  if (
    !challengeTokenSchema.safeParse(challengeToken).success ||
    !totpCodeSchema.safeParse(code).success
  ) {
    return { ok: false, code: AuthErrorCode.VALIDATION_FAILED };
  }

  try {
    const { data, headers } = await confirmEnrolment(challengeToken, code);
    await holdPendingSession(headers);
    return { ok: true, recoveryCodes: data.recoveryCodes };
  } catch (error) {
    return toActionFailure(error);
  }
}
