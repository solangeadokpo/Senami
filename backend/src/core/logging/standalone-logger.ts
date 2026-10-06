import { type Logger, pino } from 'pino';
import { appConfig } from '@config/app.config.js';
import { buildPinoOptions } from './logger-options.js';

/** Same settings as the application, for scripts running without NestJS. */
export function createStandaloneLogger(name: string): Logger {
  const config = appConfig();
  return pino({ ...buildPinoOptions(config, null), name });
}
