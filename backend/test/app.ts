import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '@src/app.module.js';
import { configureApp } from '@src/bootstrap.js';
import { SenamiExpressAdapter } from '@core/http/senami-express.adapter.js';
import { type AppConfig, appConfig } from '@config/index.js';

/** The application exactly as main.ts configures it, minus the listen. */
export async function createTestApp(
  options: { controllers?: Type[] } = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>(
    new SenamiExpressAdapter(),
  );
  configureApp(app, app.get<AppConfig>(appConfig.KEY));
  await app.init();
  return app;
}
