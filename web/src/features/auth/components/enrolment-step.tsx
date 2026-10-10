'use client';

import { useState, useTransition } from 'react';
import QRCode from 'react-qr-code';
import { confirmEnrolmentAction } from '@features/auth/actions/confirm-enrolment.action';
import { AuthHeading } from '@features/auth/components/auth-heading';
import { ChallengeTimer } from '@features/auth/components/challenge-timer';
import { EnrolmentProgress } from '@features/auth/components/enrolment-progress';
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
import { CopyButton } from '@shared/components/ui/copy-button';
import { OtpInput } from '@shared/components/ui/otp-input';
import { cn } from '@shared/utils/cn';

const CODE_LENGTH = 6;

export function EnrolmentStep({
  challenge,
  enrolment,
  onConfirmed,
  onFailure,
  onRestart,
}: {
  challenge: Challenge;
  enrolment: { otpauthUrl: string; secret: string };
  onConfirmed: (recoveryCodes: string[]) => void;
  onFailure: StepFailureHandler;
  onRestart: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const groupedSecret =
    enrolment.secret.match(/.{1,4}/g)?.join(' ') ?? enrolment.secret;

  const submit = () =>
    startTransition(async () => {
      const result = await confirmEnrolmentAction(challenge.token, code);
      if (result.ok) return onConfirmed(result.recoveryCodes);
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
      <EnrolmentProgress current={code.length === CODE_LENGTH ? 1 : 0} />
      <AuthHeading
        overline="Première connexion"
        title="Activez la double authentification"
      >
        Scannez ce QR code avec votre application d’authentification, puis
        saisissez le code à six chiffres qu’elle affiche.
      </AuthHeading>

      <div className="grid grid-cols-1 items-center justify-items-center gap-5 rounded-2xl bg-indigo-50 p-4 min-[420px]:grid-cols-[auto_minmax(0,1fr)] min-[420px]:justify-items-stretch">
        <div className="rounded-xl bg-white p-3">
          <QRCode
            value={enrolment.otpauthUrl}
            size={128}
            fgColor="#2e2a4d"
            title="QR code à scanner avec votre application d’authentification"
          />
        </div>
        <div className="grid min-w-0 gap-2">
          <p className="text-label text-slate-700 uppercase">
            Ou saisissez cette clé
          </p>
          <code className="font-sans text-sm font-bold tracking-[0.08em] break-normal [overflow-wrap:anywhere] text-indigo-900">
            {groupedSecret}
          </code>
          <div>
            <CopyButton
              text={enrolment.secret}
              label="Copier la clé"
              copiedLabel="Clé copiée"
            />
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Applications compatibles : Google Authenticator, Microsoft
        Authenticator, 2FAS, Bitwarden.
      </p>

      <div className="grid gap-2">
        <p
          id="enrolment-code-label"
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
          labelledBy="enrolment-code-label"
          describedBy="enrolment-code-help"
          isInvalid={error !== null}
          errorCount={errorCount}
          isDisabled={isPending}
        />
        <p
          id="enrolment-code-help"
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
        {isPending ? 'Vérification…' : 'Confirmer le code'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChallengeTimer
          expiresAt={challenge.expiresAt}
          onExpire={() =>
            onFailure({ ok: false, code: AuthErrorCode.INVALID_CHALLENGE })
          }
        />
        <Button type="button" variant="link" onClick={onRestart}>
          Revenir à la connexion
        </Button>
      </div>
    </form>
  );
}
