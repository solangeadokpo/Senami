import { registerAs } from '@nestjs/config';
import { env } from './env.validation.js';

export const authConfig = registerAs('auth', () => {
  const e = env();

  return {
    jwtSecret: e.JWT_SECRET,
    accessTokenTtlMinutes: e.ACCESS_TOKEN_TTL_MINUTES,
    mobileSessionDays: e.MOBILE_SESSION_DAYS,
  };
});

export type AuthConfig = ReturnType<typeof authConfig>;
