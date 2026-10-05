import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '@src/app.module.js';
import { configureApp } from '@src/bootstrap.js';
import { type AppConfig, appConfig } from '@config/index.js';

/** The application exactly as main.ts configures it, minus the listen. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app, app.get<AppConfig>(appConfig.KEY));
  await app.init();
  return app;
}
