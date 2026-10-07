/**
 * A message for the next page: set by a Server Action in a short cookie (as
 * JSON, which Next.js URI-encodes), read once by the browser. It holds no
 * personal data.
 */
export const FLASH_COOKIE = 'senami_flash';

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
