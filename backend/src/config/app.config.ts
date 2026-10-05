import type { LogLevel as NestLogLevel } from '@nestjs/common';
import { registerAs } from '@nestjs/config';
import { LogLevel, NodeEnv, env } from './env.validation.js';

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
    logLevels: resolveLogLevels(e.LOG_LEVEL),
  };
});

export type AppConfig = ReturnType<typeof appConfig>;

// Nest has no threshold: `useLogger` expects the exhaustive list of levels.
function resolveLogLevels(level: LogLevel): NestLogLevel[] {
  const hierarchy: Record<LogLevel, NestLogLevel[]> = {
    [LogLevel.VERBOSE]: ['error', 'warn', 'log', 'debug', 'verbose'],
    [LogLevel.DEBUG]: ['error', 'warn', 'log', 'debug'],
    [LogLevel.LOG]: ['error', 'warn', 'log'],
    [LogLevel.WARN]: ['error', 'warn'],
    [LogLevel.ERROR]: ['error'],
  };

  return hierarchy[level];
}
