'use server';

import {
  type TotpEnrolment,
  requestChallenge,
  startEnrolment,
} from '@features/auth/api/backoffice-auth.api';
import {
  type SignInValues,
  signInSchema,
} from '@features/auth/schemas/sign-in.schema';
import {
  type ActionResult,
  toActionFailure,
} from '@features/auth/utils/action-result';
import { AuthErrorCode } from '@features/auth/utils/auth-error-messages';
import { AuthStep } from '@shared/enums/auth-step.enum';
import { enumValue } from '@shared/utils/enum-value';

export type SignInResult = ActionResult<{
  step: AuthStep;
  challengeToken: string;
  challengeExpiresAt: string;
  /** On a first sign-in: the QR code to scan, started at once. */
  enrolment: TotpEnrolment | null;
}>;

export async function signInAction(
  values: SignInValues,
): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, code: AuthErrorCode.VALIDATION_FAILED };

  try {
    const { data: challenge } = await requestChallenge(
      parsed.data.email,
      parsed.data.password,
    );
    const step = enumValue(AuthStep, challenge.step);
    if (step === undefined) throw new Error(`Unknown step ${challenge.step}`);

    const enrolment =
      step === AuthStep.TOTP_ENROLMENT
        ? (await startEnrolment(challenge.challengeToken)).data
        : null;
    return {
      ok: true,
      step,
      challengeToken: challenge.challengeToken,
      challengeExpiresAt: challenge.challengeExpiresAt,
      enrolment,
    };
  } catch (error) {
    return toActionFailure(error);
  }
}
