import { HttpStatus } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { ERROR_CODES } from '@shared/errors/error-codes.js';
import type {
  ErrorMapper,
  ResolvedError,
} from '@shared/errors/error-mapper.js';

const MAX_CAUSE_DEPTH = 5;

/**
 * Last resort for constraint violations the repositories did not translate.
 * Never exposes the SQL message nor the constraint name: they go to `context`.
 */
export class PostgresErrorMapper implements ErrorMapper {
  map(exception: unknown): ResolvedError | undefined {
    const error = findDatabaseError(exception);
    if (error === undefined) {
      return undefined;
    }

    const context = {
      pgCode: error.code,
      ...(error.constraint === undefined
        ? {}
        : { constraint: error.constraint }),
      ...(error.table === undefined ? {} : { table: error.table }),
    };

    switch (error.code) {
      case '23505':
        return {
          status: HttpStatus.CONFLICT,
          code: ERROR_CODES.UNIQUE_VIOLATION,
          message: 'A resource with the same unique value already exists',
          context,
        };
      case '23503':
        return {
          status: HttpStatus.CONFLICT,
          code: ERROR_CODES.REFERENCE_VIOLATION,
          message: 'The operation breaks a reference between resources',
          context,
        };
      case '23502':
      case '23514':
        return {
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: ERROR_CODES.CONSTRAINT_VIOLATION,
          message: 'The operation breaks a data constraint',
          context,
        };
      case '42501':
        // Row level security refused the write: a bug or a tampering attempt.
        return {
          status: HttpStatus.FORBIDDEN,
          code: ERROR_CODES.FORBIDDEN,
          message: 'Forbidden',
          context,
          securityAlert: true,
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Internal server error',
          context,
        };
    }
  }
}

// Drizzle wraps the driver error in a DrizzleQueryError, as `cause`.
function findDatabaseError(exception: unknown): DatabaseError | undefined {
  let current: unknown = exception;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH; depth++) {
    if (current instanceof DatabaseError) {
      return current;
    }
    if (!(current instanceof Error)) {
      return undefined;
    }
    current = current.cause;
  }
  return undefined;
}
