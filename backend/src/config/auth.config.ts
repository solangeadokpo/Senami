import { registerAs } from '@nestjs/config';
import { NodeEnv, env } from './env.validation.js';

export const authConfig = registerAs('auth', () => {
  const e = env();

  return {
    jwtSecret: e.JWT_SECRET,
    accessTokenTtlMinutes: e.ACCESS_TOKEN_TTL_MINUTES,
    mobileSessionDays: e.MOBILE_SESSION_DAYS,
    backofficeSessionHours: e.BACKOFFICE_SESSION_HOURS,
    totpEncryptionKey: Buffer.from(e.TOTP_ENCRYPTION_KEY, 'base64'),
    // Secure cookies need HTTPS: off for the local http:// development stack.
    secureCookies:
      e.NODE_ENV !== NodeEnv.DEVELOPMENT && e.NODE_ENV !== NodeEnv.TEST,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;
