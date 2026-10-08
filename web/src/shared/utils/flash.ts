import { formatTime } from '@shared/utils/format-time';
import { isRecord } from '@shared/utils/is-record';

/**
 * A message for the next page: set by a Server Action in a short cookie (as
 * JSON, which Next.js URI-encodes), read once by the browser. It holds no
 * personal data.
 */
export const FLASH_COOKIE = 'senami_flash';

/** Data, formatted on display: no sentence or personal data in the cookie. */
export type Flash =
  | { kind: 'signed-in'; sessionExpiresAt: string | null }
  | { kind: 'recovery-code-used'; remaining: number }
  | { kind: 'signed-out' }
  | { kind: 'message'; text: string };

/** The flash value found in `document.cookie`, or null. */
export function readFlash(cookieHeader: string): unknown {
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${FLASH_COOKIE}=`));
  if (entry === undefined) return null;
  try {
    return JSON.parse(
      decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1)),
    ) as unknown;
  } catch {
    return null;
  }
}

// T-14: a dated, checkable fact; no congratulation.
export function describeFlash(flash: unknown): string | null {
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
    case 'message':
      return typeof flash['text'] === 'string' ? flash['text'] : null;
    default:
      return null;
  }
}
