/**
 * A full page load after signing in or out: it goes through the proxy, which
 * maps the back office host, and drops every client state of the session.
 * Server Actions cannot redirect for us: Next.js would render the target
 * directly, without the proxy.
 */
export function goToBackOffice(): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is the point
  window.location.assign('/');
}

export function goToSignIn(): void {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- a full load is the point
  window.location.assign('/connexion');
}
