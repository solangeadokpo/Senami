import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configurations, validateEnvironment } from '../config/index.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';

/**
 * Infrastructure holding state (config, pool). Imported once, by AppModule.
 * A business module needing CoreModule is a design error.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: configurations,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
  ],
})
export class CoreModule {}
