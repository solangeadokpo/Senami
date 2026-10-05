import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from './app.js';

describe('health probes', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers live outside the API prefix', async () => {
    await request(app.getHttpServer())
      .get('/health/live')
      .expect(200, { status: 'ok' });
  });

  it('answers ready when the database is reachable', async () => {
    await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200, { status: 'ok' });
  });
});
