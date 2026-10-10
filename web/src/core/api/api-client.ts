import { isRecord } from '@shared/utils/is-record';
import {
  API_UNAVAILABLE,
  ApiError,
  UNEXPECTED_RESPONSE,
} from '@core/api/api-error';
import type { ApiFieldError, ApiResponse } from '@core/api/api-types';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  /** Up to the version, e.g. http://localhost:3000/api/v1. */
  baseUrl: string;
  /** Sent with every request: the session cookie, the origin. */
  headers?: () => Promise<Record<string, string>> | Record<string, string>;
  fetch?: typeof fetch;
}

export interface ApiClient {
  /** The `data` of the envelope; `undefined` on 204. Throws ApiError. */
  request<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const send = options.fetch ?? fetch;

  return {
    async request<T>(
      path: string,
      { method = 'GET', body, signal }: RequestOptions = {},
    ): Promise<ApiResponse<T>> {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(await options.headers?.()),
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      let response: Response;
      try {
        response = await send(`${options.baseUrl}${path}`, {
          method,
          headers,
          cache: 'no-store',
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          ...(signal === undefined ? {} : { signal }),
        });
      } catch (cause) {
        if (signal?.aborted === true) throw cause;
        throw new ApiError({
          status: 503,
          code: API_UNAVAILABLE,
          message: 'The API could not be reached',
        });
      }

      // The casts below trust the API contract, typed from schema.d.ts.
      if (response.status === 204) {
        return { data: undefined as T, headers: response.headers };
      }

      const payload = await readJson(response);
      if (!response.ok) throw toApiError(response.status, payload);
      if (!isRecord(payload) || !('data' in payload)) {
        throw unexpected(response.status);
      }
      return {
        data: payload['data'] as T,
        ...(isRecord(payload['meta']) ? { meta: payload['meta'] } : {}),
        headers: response.headers,
      };
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const error = isRecord(payload) ? payload['error'] : undefined;
  if (
    !isRecord(error) ||
    typeof error['code'] !== 'string' ||
    typeof error['message'] !== 'string'
  ) {
    return unexpected(status);
  }
  return new ApiError({
    status,
    code: error['code'],
    message: error['message'],
    ...(isRecord(error['details']) ? { details: error['details'] } : {}),
    ...(Array.isArray(error['fields'])
      ? { fields: error['fields'].filter(isFieldError) }
      : {}),
    ...(typeof error['requestId'] === 'string'
      ? { requestId: error['requestId'] }
      : {}),
  });
}

function isFieldError(value: unknown): value is ApiFieldError {
  return (
    isRecord(value) &&
    typeof value['field'] === 'string' &&
    typeof value['constraint'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

function unexpected(status: number): ApiError {
  return new ApiError({
    status,
    code: UNEXPECTED_RESPONSE,
    message: `Unexpected response from the API (${status})`,
  });
}
