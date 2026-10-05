import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ERROR_CODES } from '@shared/errors/error-codes.js';
import type {
  ErrorMapper,
  FieldError,
  ResolvedError,
} from '@shared/errors/error-mapper.js';
import { flattenValidationErrors } from './flatten-validation-errors.js';

/** Thrown by the global ValidationPipe when a DTO is invalid. */
export class RequestValidationError extends Error {
  readonly fields: FieldError[];

  constructor(errors: ValidationError[]) {
    super('Request validation failed');
    this.name = RequestValidationError.name;
    this.fields = flattenValidationErrors(errors);
  }
}

export class RequestValidationErrorMapper implements ErrorMapper {
  map(exception: unknown): ResolvedError | undefined {
    if (!(exception instanceof RequestValidationError)) {
      return undefined;
    }

    return {
      status: HttpStatus.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_FAILED,
      message: exception.message,
      fields: exception.fields,
    };
  }
}
