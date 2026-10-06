# Logging

## Purpose

Give the operators one structured, searchable log stream, where every line of
a request can be found from its `X-Request-Id`, without ever writing personal
data or accident sheet content into it.

## Behaviour

- pino, through `nestjs-pino`. Code keeps using `Logger` from `@nestjs/common`,
  routed to pino by `NativeLogger` (the `nestjs-pino` adapter that mirrors the
  NestJS 12 logger, structured fields included).
- One JSON object per line on stdout (`LOG_FORMAT=json`), or human readable
  lines (`LOG_FORMAT=pretty`). Default: `pretty` in development, `json`
  elsewhere. The application never writes a log file.
- `LOG_LEVEL` keeps its values: `verbose` is pino `trace`, `log` is `info`.
- One access line per completed request: `req.method`, `req.path` (no query
  string), `res.statusCode`, `responseTime`, `requestId`. Level `info` below
  400, `warn` for 4xx, `error` for 5xx. Health probes are not logged.
- Every line written during a request carries its `requestId`, the value of
  the `X-Request-Id` header set by `requestIdMiddleware`.
- Structured fields go in an object after the message:
  `logger.warn('Student not found', { status: 404, code: 'STUDENT_NOT_FOUND' })`.
- `AllExceptionsFilter` logs `status`, `code`, `path` and `errorContext`; at
  `error` level (5xx, security alert) it adds `err`, serialised with its stack.
- Never logged: request and response bodies, query strings, any header (the
  access line keeps method and path only), the client IP address.
  `authorization`, `cookie` and `set-cookie` are also redacted wherever they
  appear in a logged object.
- The migration script logs through a standalone pino logger with the same
  settings.

## Affected areas

- `src/config/env.validation.ts`, `src/config/app.config.ts`: `LOG_FORMAT`,
  `logLevel`, `logFormat`.
- `src/core/core.module.ts`: imports `LoggingModule`.
- `src/main.ts`, `test/app.ts`: `app.useLogger(app.get(NativeLogger))`.
- `src/shared/filters/all-exceptions.filter.ts`: structured fields.
- `src/database/migrate.ts`: standalone logger.
- `src/config/env.validation.ts`: imports `reflect-metadata` itself. The
  migration script used to get it through `@nestjs/common`; without it, the
  implicit conversion of `PORT` to a number silently stops working.

## New files

| File                                    | Purpose                                      |
| --------------------------------------- | -------------------------------------------- |
| `src/core/logging/logging.module.ts`    | `LoggerModule` configured from `appConfig`   |
| `src/core/logging/logger-options.ts`    | pino and pino-http options, pure functions   |
| `src/core/logging/log-destination.ts`   | `LOG_DESTINATION` token, overridden by tests |
| `src/core/logging/standalone-logger.ts` | logger for scripts running without NestJS    |

## Tests

Unit (`logger-options.spec.ts`):

- each `LOG_LEVEL` maps to its pino level;
- the level of an access line follows the status;
- the request serialiser keeps method and path only;
- `authorization`, `cookie` and `set-cookie` are redacted.

End-to-end (`test/logging.e2e-spec.ts`, logs captured in memory):

- a request writes one access line with method, path, status, duration and
  the request id;
- neither the body, nor the query string, nor the authorization header reach
  the logs;
- an error logged by the filter carries the request id, status and code;
- an unexpected error is logged at `error` with its stack;
- health probes write no access line.

`src/shared/utils/path-without-query.spec.ts`: the query string is dropped,
suspicious paths (`//host`, `..`, `%2e%2e`) are kept as received.

## Dependencies

`requestIdMiddleware` and `AllExceptionsFilter`
([error handling](../http/error-handling-and-responses.md)).

## Out of scope

- A general request context (user, establishment) for repositories.
- Request timeout, Sentry, metrics, the `audit_logs` table.
- Log retention: set at the hosting provider (proposed: 30 days) and recorded
  in the processing register.
