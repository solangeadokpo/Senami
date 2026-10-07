/** Back office session cookie, issued by the back office sign-in (F2). */
export const SESSION_COOKIE = 'senami_session';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isUnsafeMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}
