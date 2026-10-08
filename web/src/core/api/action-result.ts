import { ApiError } from '@core/api/api-error';
import type { ApiFieldError } from '@core/api/api-types';
import { isRecord } from '@shared/utils/is-record';

/** What a Server Action returns: never a thrown API error. */
export type ActionResult<T> =
  | ({ ok: true } & T)
  | {
      ok: false;
      code: string;
      /** VALIDATION_FAILED: the field errors, by API path (`establishment.postalCode`). */
      fields?: ApiFieldError[];
      /** TOTP_LOCKED only: when the lock ends, ISO 8601. */
      lockedUntil?: string;
    };

export type ActionFailure = Extract<ActionResult<never>, { ok: false }>;

export function toActionFailure(error: unknown): ActionFailure {
  if (!(error instanceof ApiError)) throw error;
  const lockedUntil = isRecord(error.details)
    ? error.details['lockedUntil']
    : undefined;
  return {
    ok: false,
    code: error.code,
    ...(error.fields.length > 0 ? { fields: error.fields } : {}),
    ...(typeof lockedUntil === 'string' ? { lockedUntil } : {}),
  };
}
