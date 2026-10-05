import {
  type INestApplication,
  RequestMethod,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import helmet from 'helmet';
import type { AppConfig } from './config/index.js';

// Probes stay outside the prefix and versioning: an orchestrator does not
// follow API versions.
const UNPREFIXED_ROUTES = [
  { path: 'health/live', method: RequestMethod.GET },
  { path: 'health/ready', method: RequestMethod.GET },
];

/**
 * Everything that shapes what the API accepts and returns. The e2e suite calls
 * it too, so it never validates a differently configured app.
 */
export function configureApp(app: INestApplication, config: AppConfig): void {
  app.use(helmet());

  app.setGlobalPrefix(config.apiPrefix, { exclude: UNPREFIXED_ROUTES });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.defaultVersion,
  });

  app.enableCors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      // Rejected rather than dropped: a typo in a key would be silently lost.
      forbidNonWhitelisted: true,
    }),
  );
}

/** Base path of the business API, e.g. `api/v1`. */
export function apiBasePath(config: AppConfig): string {
  return `${config.apiPrefix}/v${config.defaultVersion}`;
}
