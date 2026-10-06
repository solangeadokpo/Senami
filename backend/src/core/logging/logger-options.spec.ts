import { Writable } from 'node:stream';
import { pino } from 'pino';
import { LogFormat, LogLevel } from '@config/env.validation.js';
import {
  buildPinoOptions,
  levelForStatus,
  serializeRequest,
  toPinoLevel,
} from './logger-options.js';

describe('logger options', () => {
  it.each([
    [LogLevel.VERBOSE, 'trace'],
    [LogLevel.DEBUG, 'debug'],
    [LogLevel.LOG, 'info'],
    [LogLevel.WARN, 'warn'],
    [LogLevel.ERROR, 'error'],
  ])('maps LOG_LEVEL %s to pino %s', (level, pinoLevel) => {
    expect(toPinoLevel(level)).toBe(pinoLevel);
  });

  it.each([
    [200, undefined, 'info'],
    [304, undefined, 'info'],
    [404, undefined, 'warn'],
    [422, undefined, 'warn'],
    [500, undefined, 'error'],
    [200, new Error('aborted'), 'error'],
  ])(
    'logs a %i response at the level its status calls for',
    (status, error, level) => {
      expect(levelForStatus(status, error)).toBe(level);
    },
  );

  it('keeps only the method and the path of a request', () => {
    const request = {
      method: 'POST',
      url: '/api/v1/students?q=Martin',
      headers: { authorization: 'Bearer secret' },
      remoteAddress: '203.0.113.7',
      body: { lastName: 'Martin' },
    };

    expect(serializeRequest(request)).toEqual({
      method: 'POST',
      path: '/api/v1/students',
    });
  });

  it('redacts the authorization, cookie and set-cookie headers', () => {
    const lines: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    });
    const logger = pino(
      buildPinoOptions(
        { logLevel: LogLevel.LOG, logFormat: LogFormat.JSON },
        destination,
      ),
      destination,
    );

    logger.info({
      req: { headers: { authorization: 'Bearer secret', cookie: 'sid=abc' } },
      res: { headers: { 'set-cookie': 'sid=abc' } },
    });

    const output = lines.join('');
    expect(output).not.toContain('secret');
    expect(output).not.toContain('sid=abc');
    expect(output).toContain('[Redacted]');
  });
});
