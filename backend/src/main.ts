import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { apiBasePath, configureApp } from './bootstrap.js';
import { SenamiExpressAdapter } from './core/http/senami-express.adapter.js';
import {
  type AppConfig,
  SWAGGER_PATH,
  appConfig,
  setupSwagger,
} from './config/index.js';

/** Process concerns only: logger, proxy, shutdown, Swagger, listen. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new SenamiExpressAdapter(),
    { bufferLogs: true },
  );
  const config = app.get<AppConfig>(appConfig.KEY);

  app.useLogger(config.logLevels);
  // Behind a reverse proxy: client IP for the audit log and rate limiting.
  app.set('trust proxy', 1);

  configureApp(app, config);
  app.enableShutdownHooks();

  if (!config.isProduction) {
    setupSwagger(app, config);
  }

  await app.listen(config.port, config.host);

  const logger = new Logger('Bootstrap');
  const base = `http://localhost:${config.port}`;
  logger.log(`API     : ${base}/${apiBasePath(config)}`);
  logger.log(`Health  : ${base}/health/live, ${base}/health/ready`);
  if (!config.isProduction) {
    logger.log(`Docs    : ${base}/${config.apiPrefix}/${SWAGGER_PATH}`);
  }
}

await bootstrap();
