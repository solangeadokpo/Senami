import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

const VALID_REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Keeps a caller's correlation id when it is safe to log, else makes one.
 * Registered first in configureApp, so that even a body parser error has one.
 */
export function requestIdMiddleware(
  request: Pick<Request, 'headers'>,
  response: Pick<Response, 'setHeader'>,
  next: NextFunction,
): void {
  const incoming = request.headers[REQUEST_ID_HEADER];
  const requestId =
    typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();

  request.headers[REQUEST_ID_HEADER] = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
