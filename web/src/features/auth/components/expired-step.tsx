import { Clock } from 'lucide-react';
import { AuthHeading } from '@features/auth/components/auth-heading';
import { Button } from '@shared/components/ui/button';

export function ExpiredStep({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="grid gap-6">
      <span className="grid size-16 place-items-center rounded-2xl bg-info-surface text-info">
        <Clock className="size-8" aria-hidden />
      </span>
      <AuthHeading overline="Délai dépassé" title="La vérification a expiré">
        Le code doit être saisi dans les cinq minutes qui suivent le mot de
        passe. Reconnectez-vous pour recevoir une nouvelle étape de
        vérification.
      </AuthHeading>
      <Button type="button" size="lg" className="w-full" onClick={onRestart}>
        Recommencer la connexion
      </Button>
    </div>
  );
}
