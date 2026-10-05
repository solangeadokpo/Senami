import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { AppConfig } from './app.config.js';

export const SWAGGER_PATH = 'docs';

/** Mounted outside production only: the full schema is an attack surface. */
export function setupSwagger(app: INestApplication, config: AppConfig): void {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Senami API')
      .setVersion(config.defaultVersion)
      .addBearerAuth()
      .build(),
  );

  SwaggerModule.setup(`${config.apiPrefix}/${SWAGGER_PATH}`, app, document);
}
