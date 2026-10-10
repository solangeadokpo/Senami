'use server';

import {
  activatePendingSession,
  setAuthFlash,
} from '@features/auth/api/session-cookie';

/** The recovery codes are kept: the session becomes active. */
export async function finishEnrolmentAction(): Promise<{ ok: boolean }> {
  const session = await activatePendingSession();
  // Gone after ten minutes: the sign-in starts over.
  if (session === null) return { ok: false };

  await setAuthFlash({
    kind: 'signed-in',
    sessionExpiresAt: session.expires?.toISOString() ?? null,
  });
  return { ok: true };
}
