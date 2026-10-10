'use client';

import { KeyRound } from 'lucide-react';
import { useState, useTransition } from 'react';
import { redeemRecoveryCodeAction } from '@features/auth/actions/redeem-recovery-code.action';
import { AuthHeading } from '@features/auth/components/auth-heading';
import { ChallengeTimer } from '@features/auth/components/challenge-timer';
import type {
  Challenge,
  StepFailureHandler,
} from '@features/auth/components/sign-in-flow';
import {
  AuthErrorCode,
  INVALID_RECOVERY_CODE_MESSAGE,
  describeAuthError,
} from '@features/auth/utils/auth-error-messages';
import {
  formatRecoveryCode,
  isCompleteRecoveryCode,
} from '@features/auth/utils/recovery-code';
import { goToBackOffice } from '@features/auth/utils/sign-in-navigation';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { Field, fieldControlProps } from '@shared/components/ui/field';
import { Input } from '@shared/components/ui/input';

export function RecoveryStep({
  challenge,
  onBack,
  onFailure,
}: {
  challenge: Challenge;
  onBack: () => void;
  onFailure: StepFailureHandler;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      const result = await redeemRecoveryCodeAction(challenge.token, code);
      if (result.ok) return goToBackOffice();
      if (result.code === AuthErrorCode.INVALID_TOTP_CODE) {
        return setError(INVALID_RECOVERY_CODE_MESSAGE);
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
        title="Utilisez un code de secours"
      >
        Saisissez l’un des dix codes reçus à l’activation. Chaque code ne sert
        qu’une fois.
      </AuthHeading>

      <Field id="recovery-code" label="Code de secours" error={error}>
        <Input
          {...fieldControlProps('recovery-code', error)}
          value={code}
          onChange={(event) => {
            setCode(formatRecoveryCode(event.target.value));
            setError(undefined);
          }}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXXX-XXXXX"
          className="tracking-[0.12em] tabular-nums"
          leadingIcon={<KeyRound />}
          autoFocus
        />
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isCompleteRecoveryCode(code)}
        isLoading={isPending}
      >
        {isPending ? 'Vérification…' : 'Valider le code de secours'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="link" onClick={onBack}>
          Revenir au code de l’application
        </Button>
        <ChallengeTimer
          expiresAt={challenge.expiresAt}
          onExpire={() =>
            onFailure({ ok: false, code: AuthErrorCode.INVALID_CHALLENGE })
          }
        />
      </div>
      <Alert tone="info" title="Plus aucun code ?">
        Demandez à l’équipe Sènami de réinitialiser votre double
        authentification. Vous la réactiverez à la prochaine connexion.
      </Alert>
    </form>
  );
}
