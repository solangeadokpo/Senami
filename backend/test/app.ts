import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NativeLogger } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { App } from 'supertest/types.js';
import { AppModule } from '@src/app.module.js';
import { configureApp } from '@src/bootstrap.js';
import { SenamiExpressAdapter } from '@core/http/senami-express.adapter.js';
import { LOG_DESTINATION } from '@core/logging/log-destination.js';
import { FakeEmailSender } from '@modules/email/senders/fake-email-sender.js';
import { EMAIL_SENDER } from '@shared/interfaces/email-sender.interface.js';
import { type AppConfig, appConfig } from '@config/index.js';

const DISCARD: DestinationStream = { write: () => undefined };

/**
 * The application exactly as main.ts configures it, minus the listen. Logs
 * are discarded unless a destination is given; emails are kept in memory
 * (`app.get(EMAIL_SENDER)` is a FakeEmailSender), never sent.
 */
export async function createTestApp(
  options: { controllers?: Type[]; logDestination?: DestinationStream } = {},
): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(LOG_DESTINATION)
    .useValue(options.logDestination ?? DISCARD)
    .overrideProvider(EMAIL_SENDER)
    .useValue(new FakeEmailSender())
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>(
    new SenamiExpressAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(NativeLogger));
  configureApp(app, app.get<AppConfig>(appConfig.KEY));
  await app.init();
  return app;
}
