import { registerAs } from '@nestjs/config';
import { NodeEnv, env, logSettings } from './env.validation.js';

export const appConfig = registerAs('app', () => {
  const e = env();

  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === NodeEnv.PRODUCTION,
    port: e.PORT,
    host: e.HOST,
    apiPrefix: e.API_PREFIX,
    defaultVersion: e.API_DEFAULT_VERSION,
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    ...logSettings(e),
  };
});

export type AppConfig = ReturnType<typeof appConfig>;
