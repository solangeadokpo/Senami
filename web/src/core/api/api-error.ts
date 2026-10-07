import type { ApiErrorBody, ApiFieldError } from '@core/api/api-types';

/** Branch on `code`, never on `message`: the message is for developers. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;
  readonly fields: ApiFieldError[];
  readonly requestId: string | undefined;

  constructor(
    body: Pick<ApiErrorBody, 'status' | 'code' | 'message'> &
      Partial<Pick<ApiErrorBody, 'details' | 'fields' | 'requestId'>>,
  ) {
    super(body.message);
    this.name = 'ApiError';
    this.status = body.status;
    this.code = body.code;
    this.details = body.details;
    this.fields = body.fields ?? [];
    this.requestId = body.requestId;
  }
}

/** The API could not be reached, or answered something else than JSON. */
export const API_UNAVAILABLE = 'API_UNAVAILABLE';
export const UNEXPECTED_RESPONSE = 'UNEXPECTED_RESPONSE';
