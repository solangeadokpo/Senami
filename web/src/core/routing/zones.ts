/** Internal path of the back office: never reached directly. */
export const ADMIN_PREFIX = '/admin';

/** The only back office pages reachable without a session. */
export const SIGN_IN_PATH = '/connexion';

export type ZoneDecision =
  | { kind: 'site' }
  | { kind: 'admin'; rewriteTo: string }
  | { kind: 'sign-in'; redirectTo: string }
  | { kind: 'not-found' };

/**
 * www.senami.fr serves the showcase site, app.senami.fr the back office,
 * from one Next.js app: the back office host is rewritten under /admin.
 */
export function resolveZone(
  host: string | null,
  pathname: string,
  appHost: string,
  hasSessionCookie: boolean,
): ZoneDecision {
  if (host === appHost) {
    // Optimistic: no cookie, no session. The pages check the session itself.
    if (!hasSessionCookie && pathname !== SIGN_IN_PATH) {
      return { kind: 'sign-in', redirectTo: SIGN_IN_PATH };
    }
    return { kind: 'admin', rewriteTo: `${ADMIN_PREFIX}${pathname}` };
  }
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return { kind: 'not-found' };
  }
  return { kind: 'site' };
}
