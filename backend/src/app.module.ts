import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule } from './core/core.module.js';
import { PostgresErrorMapper } from './core/database/postgres-error.mapper.js';
import { ModulesModule } from './modules/modules.module.js';
import { DomainErrorMapper } from './shared/errors/domain-error.mapper.js';
import { ERROR_MAPPERS } from './shared/errors/error-mapper.js';
import { HttpExceptionMapper } from './shared/errors/http-exception.mapper.js';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './shared/interceptors/response.interceptor.js';
import { RequestValidationErrorMapper } from './shared/validation/request-validation.error.js';

@Module({
  imports: [CoreModule, ModulesModule],
  providers: [
    {
      provide: ERROR_MAPPERS,
      // Order matters: the first mapper that recognises the error wins.
      useValue: [
        new RequestValidationErrorMapper(),
        new DomainErrorMapper(),
        new PostgresErrorMapper(),
        new HttpExceptionMapper(),
      ],
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
