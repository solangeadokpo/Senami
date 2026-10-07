'use client';

import { KeyRound } from 'lucide-react';
import { useState, useTransition } from 'react';
import { verifyCodeAction } from '@features/auth/actions/verify-code.action';
import { AuthHeading } from '@features/auth/components/auth-heading';
import { ChallengeTimer } from '@features/auth/components/challenge-timer';
import type {
  Challenge,
  StepFailureHandler,
} from '@features/auth/components/sign-in-flow';
import {
  AuthErrorCode,
  INVALID_CODE_MESSAGE,
  describeAuthError,
} from '@features/auth/utils/auth-error-messages';
import { Button } from '@shared/components/ui/button';
import { OtpInput } from '@shared/components/ui/otp-input';
import { cn } from '@shared/utils/cn';
import { goToBackOffice } from '@features/auth/utils/sign-in-navigation';

const CODE_LENGTH = 6;

export function VerifyStep({
  challenge,
  onUseRecoveryCode,
  onFailure,
}: {
  challenge: Challenge;
  onUseRecoveryCode: () => void;
  onFailure: StepFailureHandler;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await verifyCodeAction(challenge.token, code);
      if (result.ok) return goToBackOffice();
      if (result.code === AuthErrorCode.INVALID_TOTP_CODE) {
        setCode('');
        setErrorCount((count) => count + 1);
        return setError(INVALID_CODE_MESSAGE);
      }
      if (onFailure(result)) return;
      setError(describeAuthError(result.code).title);
    });

  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <AuthHeading
        overline="Double authentification"
        title="Saisissez votre code"
      >
        Ouvrez votre application d’authentification et saisissez le code à six
        chiffres affiché pour Sènami.
      </AuthHeading>

      <div className="grid gap-2">
        <p
          id="verify-code-label"
          className="text-label text-slate-700 uppercase"
        >
          Code à six chiffres
        </p>
        <OtpInput
          value={code}
          onChange={(value) => {
            setCode(value);
            setError(null);
          }}
          labelledBy="verify-code-label"
          describedBy="verify-code-help"
          isInvalid={error !== null}
          errorCount={errorCount}
          isDisabled={isPending}
          autoFocus
        />
        <p
          id="verify-code-help"
          aria-live="polite"
          className={cn(
            'min-h-5 text-sm',
            error === null ? 'text-muted-foreground' : 'text-error',
          )}
        >
          {error}
        </p>
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={code.length !== CODE_LENGTH}
        isLoading={isPending}
      >
        {isPending ? 'Vérification…' : 'Valider le code'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="link" onClick={onUseRecoveryCode}>
          <KeyRound aria-hidden />
          Utiliser un code de secours
        </Button>
        <ChallengeTimer
          expiresAt={challenge.expiresAt}
          onExpire={() =>
            onFailure({ ok: false, code: AuthErrorCode.INVALID_CHALLENGE })
          }
        />
      </div>
    </form>
  );
}
