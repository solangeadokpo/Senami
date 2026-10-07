import { type Logger, pino } from 'pino';
import { buildPinoOptions, type LoggingSettings } from './logger-options.js';

/** Same settings as the application, for scripts running without NestJS. */
export function createStandaloneLogger(
  name: string,
  settings: LoggingSettings,
): Logger {
  return pino({ ...buildPinoOptions(settings, null), name });
}
