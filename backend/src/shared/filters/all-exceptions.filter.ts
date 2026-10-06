import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES } from '@shared/errors/error-codes.js';
import {
  ERROR_MAPPERS,
  type ErrorMapper,
  type ResolvedError,
} from '@shared/errors/error-mapper.js';
import { REQUEST_ID_HEADER } from '@shared/middleware/request-id.middleware.js';
import { pathWithoutQuery } from '@shared/utils/path-without-query.js';

const INTERNAL_ERROR: ResolvedError = {
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  code: ERROR_CODES.INTERNAL_ERROR,
  message: 'Internal server error',
};

/**
 * The single translation point from an exception to a response. The mappers
 * decide status and code; this class builds the body, logs and replies.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(@Inject(ERROR_MAPPERS) private readonly mappers: ErrorMapper[]) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const resolved = this.resolve(exception);
    const requestId = request.headers[REQUEST_ID_HEADER];

    this.log(exception, resolved, request, requestId);

    response.status(resolved.status).json({
      error: {
        status: resolved.status,
        code: resolved.code,
        message: resolved.message,
        ...(resolved.details === undefined
          ? {}
          : { details: resolved.details }),
        ...(resolved.fields === undefined ? {} : { fields: resolved.fields }),
        ...(typeof requestId === 'string' ? { requestId } : {}),
        timestamp: new Date().toISOString(),
        path: pathOf(request),
      },
    });
  }

  private resolve(exception: unknown): ResolvedError {
    for (const mapper of this.mappers) {
      const resolved = mapper.map(exception);
      if (resolved !== undefined) {
        return resolved;
      }
    }
    return INTERNAL_ERROR;
  }

  // Never the request body: it may hold the content of an accident sheet.
  private log(
    exception: unknown,
    resolved: ResolvedError,
    request: Request,
    requestId: string | string[] | undefined,
  ): void {
    const line = `${request.method} ${pathOf(request)} ${resolved.status} ${resolved.code} requestId=${String(requestId)}`;
    const context =
      resolved.context === undefined
        ? ''
        : ` context=${JSON.stringify(resolved.context)}`;

    if (
      resolved.status >= Number(HttpStatus.INTERNAL_SERVER_ERROR) ||
      resolved.securityAlert === true
    ) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `${resolved.securityAlert === true ? 'SECURITY ' : ''}${line}${context}`,
        stack,
      );
      return;
    }

    this.logger.warn(`${line}${context}`);
  }
}

// originalUrl, not path: Nest strips the global prefix from `path` on an
// unknown route. The query string is dropped, it may hold personal data.
function pathOf(request: Pick<Request, 'originalUrl'>): string {
  return pathWithoutQuery(request.originalUrl);
}
