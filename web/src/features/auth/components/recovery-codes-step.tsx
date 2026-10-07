'use client';

import { useId, useState, useTransition } from 'react';
import { finishEnrolmentAction } from '@features/auth/actions/finish-enrolment.action';
import { AuthHeading } from '@features/auth/components/auth-heading';
import {
  goToBackOffice,
  goToSignIn,
} from '@features/auth/utils/sign-in-navigation';
import { EnrolmentProgress } from '@features/auth/components/enrolment-progress';
import { Button } from '@shared/components/ui/button';
import { Checkbox } from '@shared/components/ui/checkbox';
import { CopyButton } from '@shared/components/ui/copy-button';

/** Shown once: the API never gives these codes again. */
export function RecoveryCodesStep({ codes }: { codes: string[] }) {
  const keptId = useId();
  const [isKept, setIsKept] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-6">
      <EnrolmentProgress current={2} />
      <AuthHeading
        overline="Double authentification activée"
        title="Conservez vos codes de secours"
      >
        Chaque code ouvre une session une seule fois, si vous n’avez plus accès
        à votre application. Ils ne seront plus affichés.
      </AuthHeading>

      <ol className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-indigo-50 p-4">
        {codes.map((code, index) => (
          <li
            key={code}
            className="flex items-baseline gap-2 font-bold tracking-[0.08em] text-indigo-900 tabular-nums"
          >
            <span className="text-xs font-bold tracking-normal text-coral-600">
              {String(index + 1).padStart(2, '0')}
            </span>
            {code}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CopyButton
          text={codes.join('\n')}
          label="Copier les codes"
          copiedLabel="Codes copiés"
        />
        <span className="text-sm text-muted-foreground">
          Rangez-les hors de cet ordinateur.
        </span>
      </div>

      <div className="h-px bg-slate-200" />
      <label
        htmlFor={keptId}
        className="flex cursor-pointer items-start gap-3 text-sm select-none"
      >
        <Checkbox
          id={keptId}
          checked={isKept}
          onChange={(event) => setIsKept(event.target.checked)}
        />
        J’ai conservé mes dix codes de secours en lieu sûr.
      </label>
      <Button
        type="button"
        size="lg"
        className="w-full"
        disabled={!isKept}
        isLoading={isPending}
        onClick={() =>
          startTransition(async () => {
            const { ok } = await finishEnrolmentAction();
            if (ok) goToBackOffice();
            else goToSignIn();
          })
        }
      >
        Accéder au back-office
      </Button>
    </div>
  );
}
