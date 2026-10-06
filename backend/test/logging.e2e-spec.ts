import type { INestApplication } from '@nestjs/common';
import type { DestinationStream } from 'pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { isRecord } from '@shared/utils/is-record.js';
import { createTestApp } from './app.js';
import { ProbeController } from './fixtures/probe.controller.js';

const ACCESS_MESSAGES = new Set(['request completed', 'request failed']);

describe('logging', () => {
  let app: INestApplication<App>;
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];

  const destination: DestinationStream = {
    write: (line: string) => {
      raw.push(line);
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) lines.push(parsed);
    },
  };

  // The access line is written when the response finishes, which may land
  // just after supertest resolves.
  async function accessLineFor(requestId: string) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const line = lines.find(
        (entry) =>
          entry['requestId'] === requestId &&
          typeof entry['msg'] === 'string' &&
          ACCESS_MESSAGES.has(entry['msg']),
      );
      if (line !== undefined) return line;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return undefined;
  }

  beforeAll(async () => {
    app = await createTestApp({
      controllers: [ProbeController],
      logDestination: destination,
    });
  });

  beforeEach(() => {
    lines.length = 0;
    raw.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('writes one access line with method, path, status, duration and request id', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/items?page=2&limit=20')
      .set('X-Request-Id', 'log-test-0001')
      .expect(200);

    const line = await accessLineFor('log-test-0001');
    expect(line).toMatchObject({
      level: 'info',
      req: { method: 'GET', path: '/api/v1/probe/items' },
      res: { statusCode: 200 },
    });
    expect(typeof line?.['responseTime']).toBe('number');
  });

  it('never writes the body, the query string or the authorization header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/probe?lastName=Martin')
      .set('X-Request-Id', 'log-test-0002')
      .set('Authorization', 'Bearer top-secret-token')
      .send({ name: 'Léa Dupont', postalCode: '75001' })
      .expect(201);

    await accessLineFor('log-test-0002');
    const output = raw.join('');
    expect(output).not.toContain('Dupont');
    expect(output).not.toContain('Martin');
    expect(output).not.toContain('top-secret-token');
    expect(output).not.toContain('75001');
  });

  it('logs a handled error with the request id, status and code', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/missing/p42')
      .set('X-Request-Id', 'log-test-0003')
      .expect(404);

    expect(lines).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        context: 'AllExceptionsFilter',
        requestId: 'log-test-0003',
        status: 404,
        code: 'PROBE_NOT_FOUND',
        path: '/api/v1/probe/missing/p42',
        msg: 'Probe not found',
      }),
    );
    expect(await accessLineFor('log-test-0003')).toMatchObject({
      level: 'warn',
      res: { statusCode: 404 },
    });
  });

  it('logs an unexpected error at error level with its stack', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/crash')
      .set('X-Request-Id', 'log-test-0004')
      .expect(500);

    const errorLine = lines.find(
      (entry) =>
        entry['requestId'] === 'log-test-0004' &&
        entry['context'] === 'AllExceptionsFilter',
    );
    expect(errorLine).toMatchObject({ level: 'error', code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(errorLine?.['err'])).toContain('at ');
    expect(await accessLineFor('log-test-0004')).toMatchObject({
      level: 'error',
    });
  });

  it('writes no access line for health probes', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .set('X-Request-Id', 'log-test-0005')
      .expect(200);

    expect(await accessLineFor('log-test-0005')).toBeUndefined();
  });
});
