'use client';

import { LockKeyhole } from 'lucide-react';
import { useEffect } from 'react';
import { AuthHeading } from '@features/auth/components/auth-heading';
import { formatClock, useCountdown } from '@features/auth/hooks/use-countdown';
import { Alert } from '@shared/components/ui/alert';
import { Button } from '@shared/components/ui/button';
import { formatTime } from '@shared/utils/format-time';

export function LockedStep({
  until,
  onRestart,
}: {
  until: Date;
  onRestart: () => void;
}) {
  const left = useCountdown(until);

  useEffect(() => {
    if (left === 0) onRestart();
  }, [left, onRestart]);

  return (
    <div className="grid gap-6">
      <span className="grid size-16 place-items-center rounded-2xl bg-warning-surface text-warning">
        <LockKeyhole className="size-8" aria-hidden />
      </span>
      <AuthHeading
        overline="Connexion suspendue"
        title="Trop de codes incorrects"
      >
        Après cinq codes incorrects, la double authentification est bloquée
        pendant 15 minutes. Vous pourrez réessayer à{' '}
        <b className="tabular-nums">{formatTime(until)}</b>.
      </AuthHeading>
      <div className="grid gap-1">
        <p className="text-label text-slate-700 uppercase">Temps restant</p>
        <p className="font-display text-4xl font-bold tracking-tight text-indigo-900 tabular-nums">
          {formatClock(left)}
        </p>
      </div>
      <Alert tone="warning" title="Ce n’est pas vous ?">
        Si vous n’avez pas tenté de vous connecter, changez votre mot de passe
        dès la fin du blocage.
      </Alert>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={onRestart}
      >
        Revenir à la connexion
      </Button>
    </div>
  );
}
