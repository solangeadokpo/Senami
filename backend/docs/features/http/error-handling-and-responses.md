# Error handling and response envelope

## Purpose

Give every client (mobile app, back office, showcase site) one predictable
shape for successes and for failures, so that they branch on a stable `code`
and translate messages themselves. Keep services free of HTTP concerns and
make sure nothing sensitive (internal messages, SQL, request bodies) leaks
into a response or a log.

## Behaviour

### Success

| Controller returns              | Status                | Body                                                                                          |
| ------------------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| a value                         | 200 (201 for `@Post`) | `{ "data": <value> }`                                                                         |
| a `PaginatedResult`             | 200                   | `{ "data": [...], "meta": { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }` |
| nothing (`@HttpCode(204)`)      | 204                   | none                                                                                          |
| a `StreamableFile`              | 200                   | the file, no envelope                                                                         |
| anything, with `@RawResponse()` | as set                | the value as is                                                                               |

`@Serialize(Dto)` turns the value into the DTO as an allow-list: only fields
marked `@Expose()` leave the server.

### Failure

Every error, whatever its origin, produces:

```json
{
  "error": {
    "status": 404,
    "code": "STUDENT_NOT_FOUND",
    "message": "Student not found",
    "details": { "studentId": "3f2a..." },
    "fields": [
      { "field": "postalCode", "constraint": "matches", "message": "..." }
    ],
    "requestId": "b1c9...",
    "timestamp": "2026-10-06T09:12:03.000Z",
    "path": "/api/v1/students/3f2a..."
  }
}
```

`code` is always present. `details` and `fields` only when relevant.
`message` is in English and meant for developers. `path` carries no query
string.

| Origin                                  | Status       | `code`                                                                                                                                             |
| --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AuthenticationError`                   | 401          | the error's own code                                                                                                                               |
| `ForbiddenActionError`                  | 403          | the error's own code                                                                                                                               |
| `NotFoundError`                         | 404          | the error's own code                                                                                                                               |
| `ConflictError`                         | 409          | the error's own code                                                                                                                               |
| `BusinessRuleError`                     | 422          | the error's own code                                                                                                                               |
| `UnavailableError`                      | 503          | the error's own code                                                                                                                               |
| invalid DTO                             | 400          | `VALIDATION_FAILED`, with `fields`                                                                                                                 |
| malformed JSON body                     | 400          | `MALFORMED_JSON`                                                                                                                                   |
| unknown route                           | 404          | `ROUTE_NOT_FOUND`                                                                                                                                  |
| other Nest HTTP exceptions              | their status | `BAD_REQUEST`, `UNAUTHENTICATED`, `FORBIDDEN`, `METHOD_NOT_ALLOWED`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, else `HTTP_ERROR` |
| PostgreSQL `23505`                      | 409          | `UNIQUE_VIOLATION`                                                                                                                                 |
| PostgreSQL `23503`                      | 409          | `REFERENCE_VIOLATION`                                                                                                                              |
| PostgreSQL `23514`, `23502`             | 422          | `CONSTRAINT_VIOLATION`                                                                                                                             |
| PostgreSQL `42501` (row level security) | 403          | `FORBIDDEN`, logged as a security alert                                                                                                            |
| anything else                           | 500          | `INTERNAL_ERROR`                                                                                                                                   |

### Request id and logs

- `X-Request-Id`: taken from the request when it is 8 to 128 characters of
  `[A-Za-z0-9_-]`, generated otherwise; echoed in the response header, the
  error body and the log line.
- 4xx are logged at `warn` without stack, 5xx and security alerts at `error`
  with the stack. The log line carries method, path, status, code, request id
  and the error `context`. Never the request body.

## Affected areas

- `src/bootstrap.ts`: request id middleware registered first (before the
  body parser), `ValidationPipe` exception factory, `X-Request-Id` exposed
  through CORS.
- `src/main.ts` and `test/app.ts`: `SenamiExpressAdapter`.
- `src/app.module.ts`: global filter, interceptor, error mappers.
- `src/core/health/health.controller.ts`: `@RawResponse()`.

## New files

| File                                                 | Purpose                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/shared/errors/domain.error.ts`                  | `DomainError` and its six families                                         |
| `src/shared/errors/error-codes.ts`                   | generic error codes                                                        |
| `src/shared/errors/error-mapper.ts`                  | `ErrorMapper` contract, `ResolvedError`                                    |
| `src/shared/errors/domain-error.mapper.ts`           | family to status                                                           |
| `src/shared/errors/http-exception.mapper.ts`         | Nest HTTP exceptions                                                       |
| `src/shared/validation/request-validation.error.ts`  | invalid DTO error and its mapper                                           |
| `src/shared/validation/flatten-validation-errors.ts` | class-validator tree to `fields`                                           |
| `src/core/database/postgres-error.mapper.ts`         | PostgreSQL errors                                                          |
| `src/shared/filters/all-exceptions.filter.ts`        | the single filter: body, log, reply                                        |
| `src/shared/interceptors/response.interceptor.ts`    | `{ data }` / `{ data, meta }` envelope                                     |
| `src/shared/decorators/serialize.decorator.ts`       | `@Serialize(Dto)`                                                          |
| `src/shared/decorators/raw-response.decorator.ts`    | `@RawResponse()`                                                           |
| `src/shared/decorators/api-response.decorator.ts`    | Swagger: `@ApiDataResponse`, `@ApiPaginatedResponse`, `@ApiErrorResponses` |
| `src/shared/dto/error-response.dto.ts`               | Swagger schema of the error body                                           |
| `src/shared/dto/paginated-result.ts`                 | `PaginatedResult`, `PaginationMeta`                                        |
| `src/shared/dto/pagination-query.dto.ts`             | `page`, `limit` query parameters                                           |
| `src/shared/middleware/request-id.middleware.ts`     | `X-Request-Id`                                                             |
| `src/core/http/senami-express.adapter.ts`            | keeps the body parser error as `cause`, so malformed JSON is recognised    |

## Tests

Unit:

- `domain-error.mapper.spec.ts`: each family maps to its status and keeps
  code, message, details and context; a non-domain error is ignored.
- `http-exception.mapper.spec.ts`: each status maps to its generic code; a
  route-not-found exception maps to `ROUTE_NOT_FOUND`; a JSON parse failure
  maps to `MALFORMED_JSON`; a custom object payload becomes `details`.
- `postgres-error.mapper.spec.ts`: each PostgreSQL code maps to its status
  and code, unwrapped from a Drizzle query error; SQL never reaches the
  message; an RLS violation is flagged as a security alert.
- `flatten-validation-errors.spec.ts`: one field error per constraint,
  nested and array paths joined with dots.
- `all-exceptions.filter.spec.ts`: first matching mapper wins; unknown error
  gives a 500 without its message; body shape; `context` absent from the body.
- `response.interceptor.spec.ts`: wraps a value, a paginated result; leaves a
  raw response, a file and an empty result untouched; serialises through the
  DTO allow-list.
- `request-id.middleware.spec.ts`: keeps a valid id, replaces an invalid or
  missing one, echoes it in the response.
- `senami-express.adapter.spec.ts`: keeps a body parser SyntaxError as cause.
- `paginated-result.spec.ts`: meta computed from total, page and limit.

End-to-end (`test/http-contract.e2e-spec.ts`, with a probe controller):

- a domain error returns its status, code and details;
- an invalid DTO returns `VALIDATION_FAILED` with its fields;
- a malformed JSON body returns `MALFORMED_JSON`, with a request id;
- an unknown route returns `ROUTE_NOT_FOUND`, with the full path and no query
  string;
- an unexpected error returns `INTERNAL_ERROR` without its message;
- a value is wrapped in `data`, a paginated result in `data` and `meta`;
- a serialised response drops the fields not exposed;
- the request id is echoed in the header and the error body.

`test/tenant-isolation.e2e-spec.ts` also checks that a real RLS violation maps
to `FORBIDDEN`.

## Dependencies

None. Every business module will rely on this one.

## Out of scope

- Translation of messages (pending decision on i18n).
- Logging and timeout interceptors, rate limiting.
- Error handling in scheduled jobs and background tasks: they run outside
  the HTTP pipeline and handle and log their own errors.
