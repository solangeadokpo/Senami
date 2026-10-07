/** Internal path of the back office: never reached directly. */
export const ADMIN_PREFIX = '/admin';

export type ZoneDecision =
  | { kind: 'site' }
  | { kind: 'admin'; rewriteTo: string }
  | { kind: 'not-found' };

/**
 * www.senami.fr serves the showcase site, app.senami.fr the back office,
 * from one Next.js app: the back office host is rewritten under /admin.
 */
export function resolveZone(
  host: string | null,
  pathname: string,
  appHost: string,
): ZoneDecision {
  if (host === appHost) {
    return { kind: 'admin', rewriteTo: `${ADMIN_PREFIX}${pathname}` };
  }
  if (pathname === ADMIN_PREFIX || pathname.startsWith(`${ADMIN_PREFIX}/`)) {
    return { kind: 'not-found' };
  }
  return { kind: 'site' };
}
