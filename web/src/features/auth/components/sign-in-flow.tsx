'use client';

import { useCallback, useState } from 'react';
import type { SignInResult } from '@features/auth/actions/sign-in.action';
import { EnrolmentStep } from '@features/auth/components/enrolment-step';
import { ExpiredStep } from '@features/auth/components/expired-step';
import { LockedStep } from '@features/auth/components/locked-step';
import { RecoveryCodesStep } from '@features/auth/components/recovery-codes-step';
import { RecoveryStep } from '@features/auth/components/recovery-step';
import { SignInStep } from '@features/auth/components/sign-in-step';
import { VerifyStep } from '@features/auth/components/verify-step';
import type { ActionResult } from '@features/auth/utils/action-result';
import {
  AuthErrorCode,
  isChallengeLost,
} from '@features/auth/utils/auth-error-messages';
import { Logo } from '@shared/components/brand/logo';
import { AuthStep } from '@shared/enums/auth-step.enum';

/** Held in memory only: a reload starts the sign-in over. */
export interface Challenge {
  token: string;
  expiresAt: Date;
}

/** Handles the failures that leave the step; true when it did. */
export type StepFailureHandler = (
  failure: Extract<ActionResult<never>, { ok: false }>,
) => boolean;

type FlowState =
  | { step: 'sign-in' }
  | {
      step: 'enrolment';
      challenge: Challenge;
      enrolment: { otpauthUrl: string; secret: string };
    }
  | { step: 'recovery-codes'; codes: string[] }
  | { step: 'verify'; challenge: Challenge }
  | { step: 'recovery'; challenge: Challenge }
  | { step: 'locked'; until: Date }
  | { step: 'expired' };

const LOCK_MS = 15 * 60_000;

function lockEnd(lockedUntil: string | undefined): Date {
  return lockedUntil === undefined
    ? new Date(Date.now() + LOCK_MS)
    : new Date(lockedUntil);
}

export function SignInFlow() {
  const [state, setState] = useState<FlowState>({ step: 'sign-in' });
  const restart = useCallback(() => setState({ step: 'sign-in' }), []);

  const onFailure: StepFailureHandler = useCallback((failure) => {
    if (failure.code === AuthErrorCode.TOTP_LOCKED) {
      setState({ step: 'locked', until: lockEnd(failure.lockedUntil) });
      return true;
    }
    if (isChallengeLost(failure.code)) {
      setState({ step: 'expired' });
      return true;
    }
    return false;
  }, []);

  const onChallenge = (result: Extract<SignInResult, { ok: true }>) => {
    const challenge = {
      token: result.challengeToken,
      expiresAt: new Date(result.challengeExpiresAt),
    };
    if (result.step === AuthStep.TOTP_ENROLMENT && result.enrolment !== null) {
      setState({ step: 'enrolment', challenge, enrolment: result.enrolment });
    } else {
      setState({ step: 'verify', challenge });
    }
  };

  return (
    <div className="w-full max-w-[460px] rounded-3xl bg-white px-5 py-8 shadow-[0_40px_80px_-32px_rgb(0_0_0/0.6)] motion-safe:animate-rise sm:px-9 sm:py-10">
      <div className="mb-6">
        <Logo width={150} priority />
      </div>
      <div key={state.step} className="motion-safe:animate-appear">
        {state.step === 'sign-in' ? (
          <SignInStep
            onChallenge={onChallenge}
            onLocked={(until) =>
              setState({ step: 'locked', until: lockEnd(until) })
            }
          />
        ) : null}
        {state.step === 'enrolment' ? (
          <EnrolmentStep
            challenge={state.challenge}
            enrolment={state.enrolment}
            onConfirmed={(codes) => setState({ step: 'recovery-codes', codes })}
            onFailure={onFailure}
            onRestart={restart}
          />
        ) : null}
        {state.step === 'recovery-codes' ? (
          <RecoveryCodesStep codes={state.codes} />
        ) : null}
        {state.step === 'verify' ? (
          <VerifyStep
            challenge={state.challenge}
            onUseRecoveryCode={() =>
              setState({ step: 'recovery', challenge: state.challenge })
            }
            onFailure={onFailure}
          />
        ) : null}
        {state.step === 'recovery' ? (
          <RecoveryStep
            challenge={state.challenge}
            onBack={() =>
              setState({ step: 'verify', challenge: state.challenge })
            }
            onFailure={onFailure}
          />
        ) : null}
        {state.step === 'locked' ? (
          <LockedStep until={state.until} onRestart={restart} />
        ) : null}
        {state.step === 'expired' ? <ExpiredStep onRestart={restart} /> : null}
      </div>
    </div>
  );
}
