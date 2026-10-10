import 'server-only';
import { cookies } from 'next/headers';
import { publicEnv } from '@config/public-env';
import { SESSION_COOKIE } from '@core/api/session-cookie';
import { findSetCookie } from '@features/auth/utils/set-cookie';
import { isRecord } from '@shared/utils/is-record';

const SECURE = new URL(publicEnv.appUrl).protocol === 'https:';

/**
 * After the enrolment, the session waits here until the recovery codes are
 * acknowledged: under its real name, the sign-in page would see a session
 * and leave before the codes are read.
 */
const PENDING_SESSION_COOKIE = 'senami_pending_session';
const PENDING_SECONDS = 600;

/**
 * The API sets the session cookie on its response to this server: set it
 * again on the back office host. HttpOnly, the browser script never reads it.
 * Returns when the session ends.
 */
export async function keepSessionCookie(
  headers: Headers,
): Promise<Date | null> {
  const session = findSetCookie(headers.getSetCookie(), SESSION_COOKIE);
  if (session === undefined) throw new Error('The API opened no session');

  (await cookies()).set(SESSION_COOKIE, session.value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE,
    path: '/',
    ...(session.expires === undefined ? {} : { expires: session.expires }),
  });
  return session.expires ?? null;
}

/** Like keepSessionCookie, under the pending name. */
export async function holdPendingSession(headers: Headers): Promise<void> {
  const session = findSetCookie(headers.getSetCookie(), SESSION_COOKIE);
  if (session === undefined) throw new Error('The API opened no session');

  (await cookies()).set(
    PENDING_SESSION_COOKIE,
    JSON.stringify({
      value: session.value,
      expires: session.expires?.toISOString() ?? null,
    }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: SECURE,
      path: '/',
      maxAge: PENDING_SECONDS,
    },
  );
}

/** Turns the pending session into the session; its end, or null if none. */
export async function activatePendingSession(): Promise<{
  expires: Date | null;
} | null> {
  const store = await cookies();
  const pending = store.get(PENDING_SESSION_COOKIE);
  if (pending === undefined) return null;
  store.delete(PENDING_SESSION_COOKIE);

  const parsed: unknown = JSON.parse(pending.value);
  if (!isRecord(parsed) || typeof parsed['value'] !== 'string') return null;
  const expires =
    typeof parsed['expires'] === 'string' ? new Date(parsed['expires']) : null;

  store.set(SESSION_COOKIE, parsed['value'], {
    httpOnly: true,
    sameSite: 'lax',
    secure: SECURE,
    path: '/',
    ...(expires === null ? {} : { expires }),
  });
  return { expires };
}

export async function dropSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
