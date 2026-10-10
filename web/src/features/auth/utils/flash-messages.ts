import { formatTime } from '@shared/utils/format-time';
import { isRecord } from '@shared/utils/is-record';

/** The messages the sign-in leaves for the next page. */
export type AuthFlash =
  | { kind: 'signed-in'; sessionExpiresAt: string | null }
  | { kind: 'recovery-code-used'; remaining: number }
  | { kind: 'signed-out' };

// T-14: a dated, checkable fact; no congratulation.
export function describeAuthFlash(flash: unknown): string | null {
  if (!isRecord(flash)) return null;
  switch (flash['kind']) {
    case 'signed-in': {
      const until = flash['sessionExpiresAt'];
      return typeof until === 'string'
        ? `Connexion établie. Session ouverte jusqu’à ${formatTime(new Date(until))}.`
        : 'Connexion établie.';
    }
    case 'recovery-code-used': {
      const remaining = flash['remaining'];
      if (typeof remaining !== 'number') return null;
      return remaining === 0
        ? 'Connexion avec votre dernier code de secours. Demandez une réinitialisation de la double authentification.'
        : `Connexion avec un code de secours. Il vous en reste ${remaining}.`;
    }
    case 'signed-out':
      return 'Vous êtes déconnecté.';
    default:
      return null;
  }
}
