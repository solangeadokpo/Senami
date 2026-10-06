import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { type AppConfig, appConfig } from '@config/index.js';
import { LOG_DESTINATION, type LogDestination } from './log-destination.js';
import { buildPinoHttpOptions } from './logger-options.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      providers: [{ provide: LOG_DESTINATION, useValue: null }],
      inject: [appConfig.KEY, LOG_DESTINATION],
      useFactory: (config: AppConfig, destination: LogDestination) => {
        const options = buildPinoHttpOptions(config, destination);
        return {
          pinoHttp: destination === null ? options : [options, destination],
          // logger.warn('message', { status }) puts `status` at the root.
          nativeLogger: { flattenParams: true },
        };
      },
    }),
  ],
})
export class LoggingModule {}
