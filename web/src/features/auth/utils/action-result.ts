import { ApiError } from '@core/api/api-error';
import { isRecord } from '@shared/utils/is-record';

/** What a sign-in Server Action returns: never a thrown API error. */
export type ActionResult<T> =
  | ({ ok: true } & T)
  | {
      ok: false;
      code: string;
      /** TOTP_LOCKED only: when the lock ends, ISO 8601. */
      lockedUntil?: string;
    };

export function toActionFailure(
  error: unknown,
): Extract<ActionResult<never>, { ok: false }> {
  if (!(error instanceof ApiError)) throw error;
  const lockedUntil = isRecord(error.details)
    ? error.details['lockedUntil']
    : undefined;
  return {
    ok: false,
    code: error.code,
    ...(typeof lockedUntil === 'string' ? { lockedUntil } : {}),
  };
}
