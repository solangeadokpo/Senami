import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { isRecord } from '@shared/utils/is-record.js';
import { ERROR_CODES, type ErrorCode } from './error-codes.js';
import type { ErrorMapper, ResolvedError } from './error-mapper.js';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.METHOD_NOT_ALLOWED]: ERROR_CODES.METHOD_NOT_ALLOWED,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ERROR_CODES.SERVICE_UNAVAILABLE,
};

/**
 * Nest HTTP exceptions. Services never throw them, so they come from the
 * framework (unknown route, body parser) or from a guard.
 */
export class HttpExceptionMapper implements ErrorMapper {
  map(exception: unknown): ResolvedError | undefined {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }

    const status = exception.getStatus();
    const response = exception.getResponse();

    if (exception instanceof NotFoundException) {
      return {
        status,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Route not found',
      };
    }

    if (
      status === Number(HttpStatus.BAD_REQUEST) &&
      exception.cause instanceof SyntaxError
    ) {
      return {
        status,
        code: ERROR_CODES.MALFORMED_JSON,
        message: 'Malformed JSON body',
      };
    }

    const code = CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;

    // The standard Nest payload carries `message`; anything else (a health
    // probe result) is a set of details.
    if (isRecord(response) && !('message' in response)) {
      return { status, code, message: exception.message, details: response };
    }

    return { status, code, message: exception.message };
  }
}
