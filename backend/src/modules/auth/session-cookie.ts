import type { CookieOptions } from 'express';
import type { AuthConfig } from '@config/auth.config.js';

/** The back office session cookie. JavaScript never reads it. */
export function sessionCookieOptions(
  config: Pick<AuthConfig, 'secureCookies'>,
  expiresAt?: Date,
): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookies,
    path: '/',
    ...(expiresAt === undefined ? {} : { expires: expiresAt }),
  };
}
