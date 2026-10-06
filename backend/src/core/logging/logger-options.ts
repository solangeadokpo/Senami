import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { type Level, type LoggerOptions, stdTimeFunctions } from 'pino';
import type { Options } from 'pino-http';
import { LogFormat, LogLevel } from '@config/env.validation.js';
import { REQUEST_ID_HEADER } from '@shared/middleware/request-id.middleware.js';
import { pathWithoutQuery } from '@shared/utils/path-without-query.js';
import type { LogDestination } from './log-destination.js';

export interface LoggingSettings {
  logLevel: LogLevel;
  logFormat: LogFormat;
}

const PINO_LEVELS: Record<LogLevel, Level> = {
  [LogLevel.VERBOSE]: 'trace',
  [LogLevel.DEBUG]: 'debug',
  [LogLevel.LOG]: 'info',
  [LogLevel.WARN]: 'warn',
  [LogLevel.ERROR]: 'error',
};

// Wherever these appear in a logged object. The access line drops every
// header anyway; this covers an object logged by hand.
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  'headers["set-cookie"]',
];

const HEALTH_PROBE = /^\/health\//;

export function toPinoLevel(level: LogLevel): Level {
  return PINO_LEVELS[level];
}

export function levelForStatus(statusCode: number, error?: Error): Level {
  if (error !== undefined || statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/** Keeps method and path: no header, no IP address, no body. */
export function serializeRequest(request: { method?: string; url?: string }): {
  method: string | undefined;
  path: string;
} {
  return { method: request.method, path: pathWithoutQuery(request.url ?? '/') };
}

export function buildPinoOptions(
  settings: LoggingSettings,
  destination: LogDestination,
): LoggerOptions {
  const pretty =
    settings.logFormat === LogFormat.PRETTY && destination === null;

  return {
    level: toPinoLevel(settings.logLevel),
    redact: { paths: REDACTED_PATHS, censor: '[Redacted]' },
    timestamp: stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    ...(pretty
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        }
      : {}),
  };
}

export function buildPinoHttpOptions(
  settings: LoggingSettings,
  destination: LogDestination,
): Options<IncomingMessage, ServerResponse> {
  return {
    ...buildPinoOptions(settings, destination),
    // Set by requestIdMiddleware, which runs before this middleware.
    genReqId: (request) => {
      const requestId = request.headers[REQUEST_ID_HEADER];
      return typeof requestId === 'string' ? requestId : randomUUID();
    },
    customAttributeKeys: { reqId: 'requestId' },
    // Lines written during a request carry its id, not the whole request.
    quietReqLogger: true,
    autoLogging: {
      ignore: (request) =>
        HEALTH_PROBE.test(pathWithoutQuery(request.url ?? '/')),
    },
    customLogLevel: (_request, response, error) =>
      levelForStatus(response.statusCode, error),
    customSuccessMessage: () => 'request completed',
    customErrorMessage: () => 'request failed',
    serializers: {
      req: serializeRequest,
      res: (response: { statusCode: number }) => ({
        statusCode: response.statusCode,
      }),
    },
  };
}
