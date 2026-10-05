import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './app.js';
import { ProbeController } from './fixtures/probe.controller.js';

describe('HTTP contract: responses and errors', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a domain error with its status, code and details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/missing/p42')
      .expect(404);

    expect(response.body).toMatchObject({
      error: {
        status: 404,
        code: 'PROBE_NOT_FOUND',
        message: 'Probe not found',
        details: { probeId: 'p42' },
        path: '/api/v1/probe/missing/p42',
      },
    });
  });

  it('returns VALIDATION_FAILED with the invalid fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: '', postalCode: '7500', extra: true })
      .expect(400);

    expect(response.body).toMatchObject({
      error: { status: 400, code: 'VALIDATION_FAILED' },
    });
    expect(response.body).toHaveProperty('error.fields');
    const body: unknown = response.body;
    const fields = JSON.stringify(body);
    expect(fields).toContain('"field":"name","constraint":"isNotEmpty"');
    expect(fields).toContain('"field":"postalCode","constraint":"matches"');
    expect(fields).toContain(
      '"field":"extra","constraint":"whitelistValidation"',
    );
  });

  it('returns MALFORMED_JSON for a body that is not JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expect(response.body).toMatchObject({
      error: { code: 'MALFORMED_JSON' },
    });
    expect(response.body).toHaveProperty('error.requestId');
  });

  it('returns ROUTE_NOT_FOUND for an unknown route', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/nowhere?name=Martin')
      .expect(404);

    expect(response.body).toMatchObject({
      error: { code: 'ROUTE_NOT_FOUND', path: '/api/v1/nowhere' },
    });
  });

  it('returns INTERNAL_ERROR without the message of an unexpected error', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/crash')
      .expect(500);

    expect(response.body).toMatchObject({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(response.text).not.toContain('secret internal detail');
  });

  it('wraps a value in data', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok', postalCode: '75001' })
      .expect(201, { data: { name: 'ok', postalCode: '75001' } });
  });

  it('wraps a paginated result in data and meta', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/items?page=2&limit=20')
      .expect(200, {
        data: [{ id: 'p1' }],
        meta: {
          page: 2,
          limit: 20,
          total: 41,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
  });

  it('drops the fields the response DTO does not expose', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/item')
      .expect(200, { data: { id: 'p1' } });
  });

  it('answers 204 without body when there is nothing to return', async () => {
    const response = await request(app.getHttpServer())
      .delete('/api/v1/probe/p1')
      .expect(204);

    expect(response.text).toBe('');
  });

  it('echoes the request id in the header and the error body', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/missing/p1')
      .set('X-Request-Id', 'client-request-1234')
      .expect(404);

    expect(response.headers['x-request-id']).toBe('client-request-1234');
    expect(response.body).toMatchObject({
      error: { requestId: 'client-request-1234' },
    });
  });

  it('generates a request id when the client sends none', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200, { status: 'ok' });

    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
