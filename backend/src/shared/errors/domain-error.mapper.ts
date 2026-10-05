import { HttpStatus } from '@nestjs/common';
import {
  AuthenticationError,
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenActionError,
  NotFoundError,
  UnavailableError,
} from './domain.error.js';
import type { ErrorMapper, ResolvedError } from './error-mapper.js';

export class DomainErrorMapper implements ErrorMapper {
  map(exception: unknown): ResolvedError | undefined {
    if (!(exception instanceof DomainError)) {
      return undefined;
    }

    return {
      status: statusOf(exception),
      code: exception.code,
      message: exception.message,
      ...(exception.details === undefined
        ? {}
        : { details: exception.details }),
      ...(exception.context === undefined
        ? {}
        : { context: exception.context }),
    };
  }
}

function statusOf(error: DomainError): number {
  if (error instanceof AuthenticationError) return HttpStatus.UNAUTHORIZED;
  if (error instanceof ForbiddenActionError) return HttpStatus.FORBIDDEN;
  if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (error instanceof ConflictError) return HttpStatus.CONFLICT;
  if (error instanceof BusinessRuleError)
    return HttpStatus.UNPROCESSABLE_ENTITY;
  if (error instanceof UnavailableError) return HttpStatus.SERVICE_UNAVAILABLE;
  // A DomainError outside the six families is a programming error.
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
