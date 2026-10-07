# Backend conventions

How the API is structured and the practices every change follows. Reviews
check against this file. The data model has its own document:
[`database.md`](database.md).

## Structure

```
src/
├── main.ts              process: logger, proxy, shutdown, Swagger, listen
├── bootstrap.ts         what shapes the API: prefix, versioning, validation, CORS
├── app.module.ts        assembles core and modules
├── config/              environment contract and typed namespaces (stateless)
├── core/                state: config module, database pool, health probes
├── shared/              stateless building blocks: errors, filters, DTOs, decorators
├── database/schema/     Drizzle tables, one file per domain
└── modules/             the business surface, one folder per module
test/                    end-to-end tests
drizzle/                 SQL migrations
docs/                    this file, database.md, features/<resource>/<feature>.md
```

| Folder     | Rule                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `config/`  | Definitions only. No state, no I/O.                                                                   |
| `core/`    | Holds state. Imported once, by `AppModule`. A business module needing `CoreModule` is a design error. |
| `shared/`  | Stateless, importable anywhere, grouped by technical kind (below).                                    |
| `modules/` | Each module is registered in `modules.module.ts`, the only change outside its folder.                 |

### Shared, by technical kind

`shared/` is a toolbox, grouped by the kind of building block. Business
modules are the opposite: grouped by feature.

```
src/shared/
├── decorators/    *.decorator.ts     public, roles, current-user, serialize, ...
├── dto/           *.dto.ts           pagination, error response
├── enums/         *.enum.ts          every domain enum (the pgEnums are built from them)
├── errors/        domain errors, error codes, error mappers
├── filters/       *.filter.ts
├── interceptors/  *.interceptor.ts
├── interfaces/    *.interface.ts     authenticated user, clock (+ its injection token)
├── middleware/    *.middleware.ts
├── testing/       test doubles shared by modules (fake clock)
├── utils/         pure functions
└── validation/    request validation
```

A new shared building block goes in the folder of its kind; create the folder
if the kind is new. No folder named after a feature (`shared/auth/`) in
`shared/`.

### A business module

A module always has the same sub-folders, even with a single file in one of
them: no file moves the day a second controller arrives.

```
src/modules/auth/
├── auth.module.ts
├── auth.constants.ts
├── auth.errors.ts                    DomainError subclasses of the module
├── access-policy.ts                  a pure business rule (+ .spec.ts)
├── controllers/
│   ├── auth.controller.ts
│   └── sessions.controller.ts
├── services/
│   ├── auth.service.ts               (+ auth.service.spec.ts, next to it)
│   ├── sessions.service.ts
│   ├── token.service.ts
│   └── password-hasher.service.ts
├── guards/
│   ├── auth.guard.ts
│   └── roles.guard.ts
├── repositories/
│   ├── auth.repository.ts            interface + Symbol token
│   ├── auth.repository.drizzle.ts    the only file importing Drizzle
│   └── auth.repository.fake.ts       in memory, for the service tests
├── dto/
│   ├── mobile-login.dto.ts
│   └── auth-response.dto.ts
└── testing/                          fixtures for the module tests, excluded from the build
```

Kinds a module may hold: `controllers/`, `services/`, `repositories/`,
`dto/`, and when needed `guards/`, `interceptors/`, `pipes/`, `testing/`.
Module-wide files (`*.module.ts`, `*.errors.ts`, `*.constants.ts`) stay at
the module root. Unit tests sit next to the file they test.

## Layering and dependency injection

`controller -> service -> repository interface`.

- The service depends on the repository **interface**, injected through a
  `Symbol` token (`STUDENTS_REPOSITORY`) bound to the Drizzle class in the
  module file. A TypeScript interface does not exist at runtime, hence the
  token.
- Constructor injection only. A long constructor signals a service doing too
  much: split it.
- Only the service is exported from a module. Another module goes through
  that service, never through the repository, so business rules cannot be
  bypassed.
- No circular imports between modules. If two modules need each other,
  extract the shared part or use events.
- Default (singleton) scope. A request-scoped provider makes its whole
  injection chain request-scoped: justify it in the pull request.

| From       | To                                   | Allowed |
| ---------- | ------------------------------------ | ------- |
| controller | repository                           | no      |
| service    | `DRIZZLE`, Drizzle types, the schema | no      |
| service    | `@nestjs/common` HTTP exceptions     | no      |
| repository | business errors                      | no      |
| module A   | repository of module B               | no      |

## Data access

- Repositories receive `DRIZZLE` and are the only place where queries are
  written. They return plain objects or entities, never Drizzle types.
- **Tenant data** (`students`, `useful_contacts`, `sheet_recipients`,
  `declaration_submissions`, `payments`) is reachable only inside
  `withTenant(db, establishmentId, tx => ...)`, or `asSuperAdmin(...)` for the
  super administrator and system jobs. Outside them, row level security makes
  the tables read as empty. The `establishmentId` comes from the authenticated
  user, never from the request.
- Several writes that must succeed together go in one transaction.
- Select only the columns needed; load relations in one query, not one per
  row (N+1).
- Business rules live in services, never in SQL views or stored functions:
  the database only holds integrity and security guarantees (constraints,
  row level security, append-only history).
- Schema changes go through migrations, never `drizzle-kit push`. See
  [`database.md`](database.md#changing-the-schema).

## Responses

Controllers return the value; they never build a response.
`ResponseInterceptor` wraps it. This is the contract with the web and mobile
clients.

| Controller returns                                                    | Response                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| a value                                                               | `{ "data": <value> }` (201 for a `@Post`)                                                     |
| a `PaginatedResult` (`PaginatedResult.of(items, total, page, limit)`) | `{ "data": [...], "meta": { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }` |
| nothing, with `@HttpCode(204)`                                        | 204, no body                                                                                  |
| a `StreamableFile`                                                    | the file, no envelope                                                                         |
| anything, with `@RawResponse()`                                       | as is: health probes, provider webhooks only                                                  |

- `@Serialize(ResponseDto)` on every endpoint returning data: only fields
  marked `@Expose()` leave the server. Never return a database row as is.
- List endpoints take a query DTO extending `PaginationQueryDto` (`page`,
  `limit`, at most 100).
- Document with `@ApiDataResponse(Dto)`, `@ApiPaginatedResponse(Dto)` and
  `@ApiErrorResponses(...statuses)`.

## Errors

### Throwing

- Services throw a `DomainError` subclass, never an HTTP exception. Each
  module declares its errors in `<module>.errors.ts`, extending one family:

  | Family                 | Status | Example code                 |
  | ---------------------- | ------ | ---------------------------- |
  | `AuthenticationError`  | 401    | `SESSION_REVOKED`            |
  | `ForbiddenActionError` | 403    | `SUBSCRIPTION_SUSPENDED`     |
  | `NotFoundError`        | 404    | `STUDENT_NOT_FOUND`          |
  | `ConflictError`        | 409    | `USER_EMAIL_ALREADY_USED`    |
  | `BusinessRuleError`    | 422    | `NO_PRIMARY_RECIPIENT`       |
  | `UnavailableError`     | 503    | `EMAIL_PROVIDER_UNAVAILABLE` |

  ```ts
  export class StudentNotFoundError extends NotFoundError {
    readonly code = 'STUDENT_NOT_FOUND';
    constructor(studentId: string) {
      super('Student not found', { details: { studentId } });
    }
  }
  ```

- 400 means a malformed request (the DTO, the JSON); 422 means a well-formed
  request a business rule refuses.
- `message` is in English, for developers. `details` holds parameters the
  client uses to build its own (translated) message. `context` is logged
  only: anything sensitive goes there, never in `message` or `details`.
- An expected database conflict (an email already used) is translated by the
  repository into a domain error. The generic `UNIQUE_VIOLATION`,
  `REFERENCE_VIOLATION`, `CONSTRAINT_VIOLATION` codes are a safety net.

### Error body

Every error, whatever its origin, has this shape:

```json
{
  "error": {
    "status": 400,
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed",
    "details": { "...": "..." },
    "fields": [
      { "field": "postalCode", "constraint": "matches", "message": "..." }
    ],
    "requestId": "b1c9...",
    "timestamp": "2026-10-06T09:12:03.000Z",
    "path": "/api/v1/students"
  }
}
```

`code` is always present and is what clients branch on. Generic codes:
`VALIDATION_FAILED`, `MALFORMED_JSON`, `BAD_REQUEST`, `UNAUTHENTICATED`,
`FORBIDDEN`, `ROUTE_NOT_FOUND`, `METHOD_NOT_ALLOWED`, `PAYLOAD_TOO_LARGE`,
`RATE_LIMITED`, `UNIQUE_VIOLATION`, `REFERENCE_VIOLATION`,
`CONSTRAINT_VIOLATION`, `SERVICE_UNAVAILABLE`, `HTTP_ERROR`,
`INTERNAL_ERROR` (`src/shared/errors/error-codes.ts`).

### How it works

`AllExceptionsFilter` is the single exit for errors. It asks an ordered list
of mappers (`ERROR_MAPPERS`, in `app.module.ts`) to translate the exception;
the first that recognises it wins, else 500 `INTERNAL_ERROR`. To support a new
kind of error (a payment provider SDK), add a mapper, do not touch the filter.

Every request carries an `X-Request-Id` (kept from the client when safe,
generated otherwise), echoed in the response and in the error body, and on
every log line. 4xx are logged at `warn`, 5xx and security alerts at `error`
with the stack (see [Logging](#logging)).

### Catching

- Never `try/catch` to swallow an error. Catch the narrowest thing, and pass
  the original as `cause`. Do not catch just to log and rethrow: the filter
  logs.
- A caught value is `unknown`: narrow it, never cast it.
- The filter only sees HTTP requests. Scheduled jobs and background tasks
  catch and log their own errors; a promise is never left unhandled.

## Logging

pino, through `nestjs-pino`. Code logs with `Logger` from `@nestjs/common`;
`main.ts` routes it to pino (`NativeLogger`).

```ts
private readonly logger = new Logger(StudentsService.name);

this.logger.log('Students imported', { establishmentId, created: 12 });
this.logger.warn('Import row rejected', { establishmentId, row: 7 });
this.logger.error('Email provider failed', { err: error });
```

- **Message first, then an object of fields.** The fields land at the root of
  the JSON line, so they can be searched. Never build them into the message.
- **Identifiers, never personal data**: `studentId`, `establishmentId`, not a
  name or an email. Never anything from an accident sheet.
- Every line written during a request carries its `requestId` automatically.
- One access line per request (method, path, status, duration), written by
  `pino-http`: do not log "request received" yourself. Health probes are not
  logged.
- Never logged, by configuration: request and response bodies, query strings,
  headers, the client IP address. `authorization`, `cookie` and `set-cookie`
  are redacted wherever they appear.
- Levels: `error` needs an action, `warn` is an expected failure (4xx, a
  rejected import row), `log` a business event, `debug` and `verbose` for
  diagnosis. `LOG_LEVEL` sets the threshold.
- `LOG_FORMAT=json` (default outside development) writes one JSON object per
  line on stdout; `pretty` is for a terminal only, its formatter is not in the
  production image. The application never writes log files: the host
  collects stdout and owns the retention.
- A script running without Nest uses `createStandaloneLogger(name)`.

## Domain values

A value with a business meaning (a role, a channel, a status) is an enum,
never a string written by hand. The PostgreSQL enum is built from the same
TypeScript enum (`pgEnum('user_role', UserRole)`), so the value exists in one
place only.

```ts
// Wrong
if (user.role === 'super_admin') {}
@Roles('responsable')

// Right
if (user.role === UserRole.SUPER_ADMIN) {}
@Roles(UserRole.RESPONSABLE)
```

Every enum lives in `src/shared/enums/<name>.enum.ts`. In the Drizzle schema,
a value inlined in a check constraint or a partial index goes through
`sqlValue(UserStatus.ACTIVE)` or `sqlValues(Object.values(DevicePlatform))`,
never a quoted string. In tests too: `status: UserStatus.DEACTIVATED`.

ESLint rejects the role and channel values written by hand
(`no-restricted-syntax`). Values that are common words (`active`, `new`) cannot
be banned mechanically: review checks them.

## Authentication

Every route requires an authenticated session by default
([spec](features/auth/authentication-and-sessions.md)). The global
`AuthGuard` reads the session from the database on each request, so a
revocation or a deactivation applies at once.

```ts
@Public()                               // opt out: health, sign-in, public forms
@Roles(UserRole.RESPONSABLE, UserRole.SUPER_ADMIN) // restrict; none = any role
handler(@CurrentUser() user: AuthenticatedUser) {}
```

- `user.establishmentId` is the tenant of the request: pass it to
  `withTenant()`. Never take an establishment id from the body or the query
  to decide what a user may see.
- Hide what a user may not reach: another establishment's resource answers
  404, as if it did not exist, not 403.
- Passwords are hashed with argon2id (`PasswordHasher`); tokens are only
  stored as hashes. Never log a password, a token or a cookie.
- Services take the time from the injected `Clock` (`CLOCK`), not from
  `new Date()`, so that tests control it.

## API

- URI versioning (`/api/v1/...`). Health probes stay outside the prefix and
  versioning.
- Every input is a DTO validated by `class-validator`. The global
  `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`: an unknown
  field is a 400 `VALIDATION_FAILED`, not silently dropped.
- Four DTO shapes per resource: `create-`, `update-`, `list-<r>-query-`,
  `<r>-response-`.
- Every endpoint is protected by a guard unless explicitly public, and checks
  the role (intervenant, responsable, super admin) it requires.
- Cross-cutting concerns are interceptors, filters or middleware, not code
  repeated in controllers.

## Security and personal data

- **No accident sheet content is stored or logged**: not in a table, a job
  queue, a cache, a log line or an error report. The declaration endpoint is
  processed in memory, within the request. Never log its request or response
  body, and never move it to a background queue (a queue persists its payload).
- Passwords, tokens and recovery codes are stored hashed; the TOTP secret is
  encrypted.
- Rate limiting on authentication and public form endpoints.
- Collect nothing beyond what the functional specification lists.

## Configuration

- Every environment variable is declared and validated in
  `src/config/env.validation.ts` (the boot fails naming a missing one) and
  documented in `.env.example`.
- Code injects a namespace (`@Inject(appConfig.KEY)`), never reads
  `process.env`.

## Lifecycle

- `enableShutdownHooks()` is on; a provider holding a resource releases it in
  `onApplicationShutdown` (see `DatabaseModule`).
- `/health/live` says whether to restart the process, `/health/ready` whether
  to send it traffic. Do not merge them.

## TypeScript

`strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitOverride`, `noImplicitReturns`, `noUnusedLocals`,
`noUnusedParameters`.

- No `any`, and no `as` cast used to silence the compiler.
- `exactOptionalPropertyTypes`: spread conditionally
  (`...(x === undefined ? {} : { x })`) rather than passing `undefined`.
- `noUncheckedIndexedAccess`: `array[0]` is `T | undefined`; destructure and
  test.
- `import type` for type-only imports (enforced by ESLint).

## Imports

The project is native ESM (`"type": "module"`). All the code is TypeScript;
an import names the **compiled** file, so it ends in `.js`. Node requires the
exact file at runtime and TypeScript does not rewrite paths.

- **Aliases** for anything outside the current folder, never `../` (ESLint
  rejects it):

  | Alias         | Folder                                                     |
  | ------------- | ---------------------------------------------------------- |
  | `@config/*`   | `src/config/`                                              |
  | `@core/*`     | `src/core/`                                                |
  | `@shared/*`   | `src/shared/`                                              |
  | `@modules/*`  | `src/modules/`                                             |
  | `@database/*` | `src/database/`                                            |
  | `@src/*`      | `src/` (root files: `app.module`, `bootstrap`; tests only) |

  ```ts
  import { env } from '@config/env.validation.js';
  import { NotFoundError } from '@shared/errors/domain.error.js';
  import { StudentsService } from './students.service.js';
  ```

- `./` stays for a file of the same folder or below.
- Import the narrowest path: `@shared/errors/domain.error.js` rather than the
  `@shared/index.js` barrel, which pulls more than a single file needs.
- Aliases are declared once, in `tsconfig.json` (`paths`). `nest build`
  rewrites them into relative paths in `dist/`; Vitest resolves them through
  `vite-tsconfig-paths`. A new top-level folder under `src/` gets its alias
  there, and in the ESLint message of `no-restricted-imports`.

## Testing

- Vitest. Unit tests are co-located (`*.spec.ts`) and never touch a database:
  the service runs on the fake repository, bound through its token. The fake
  honours filters and ordering, or it hides bugs.
- End-to-end tests live in `test/*.e2e-spec.ts`, build the app with
  `createTestApp()` (which calls `configureApp()`), and run against the
  `senami_test` database. Never redeclare pipes or prefixes in a test.
- External services (email, payment, AI) are replaced by test doubles.
- One test per behaviour and per failure case of the feature spec; test names
  come from the spec.

## Language

**Everything in the code is in English**: identifiers (variables, functions,
methods, classes, interfaces, types, enums and their members, files,
folders), comments, docstrings, test names, log messages, error codes,
commit messages and documentation.

The only French text is what end users read: error messages meant for
display, email bodies, the PDF sheet. It lives in string values, never in an
identifier.

```ts
// Wrong
const nombreDeclarations = await this.repo.compterParMois(etablissementId);

// Right
const declarationCount = await this.repo.countByMonth(establishmentId);
```

Business terms that have no faithful English equivalent keep their French
form **as values**, not as identifiers: the `establishment_type` values
`maternelle`, `college`, `lycee`, the role `intervenant`.

## Naming

Casing follows the NestJS and TypeScript conventions below. ESLint enforces
the TypeScript part (`@typescript-eslint/naming-convention` in
`eslint.config.mjs`); review covers the rest.

### TypeScript

| Element                       | Case                                          | Example                                    |
| ----------------------------- | --------------------------------------------- | ------------------------------------------ |
| Variable, parameter, property | `camelCase`                                   | `establishmentId`, `receivedAt`            |
| Boolean                       | `camelCase` with `is`, `has`, `can`, `should` | `isActive`, `canDeclare`                   |
| Function, method              | `camelCase`, starting with a verb             | `findById()`, `allocateNumber()`           |
| Class                         | `PascalCase` + role suffix                    | `StudentsService`, `CreateStudentDto`      |
| Interface, type alias         | `PascalCase`, no `I` prefix                   | `StudentsRepository`, `AppConfig`          |
| Generic type parameter        | `T` or `T` + `PascalCase`                     | `T`, `TEntity`                             |
| Enum                          | `PascalCase`, singular                        | `UserRole`, `LogLevel`                     |
| **Enum member**               | **`UPPER_CASE`**                              | `SUPER_ADMIN`, `PRODUCTION`                |
| Enum value                    | `lower_snake_case` string                     | `SUPER_ADMIN = 'super_admin'`              |
| Module-level constant         | `UPPER_CASE`                                  | `DATABASE_TIMEOUT_MS`, `UNPREFIXED_ROUTES` |
| Injection token               | `UPPER_CASE` `Symbol`                         | `STUDENTS_REPOSITORY`, `DRIZZLE`           |
| Custom decorator              | `PascalCase`                                  | `@CurrentUser()`, `@Public()`              |
| Private member                | `camelCase`, no `_` prefix                    | `private readonly logger`                  |
| Error code                    | `UPPER_CASE` string                           | `STUDENT_NOT_FOUND`                        |
| Environment variable          | `UPPER_CASE`                                  | `DATABASE_URL`                             |

```ts
export enum UserRole {
  INTERVENANT = 'intervenant',
  RESPONSABLE = 'responsable',
  SUPER_ADMIN = 'super_admin',
}
```

`UPPER_CASE` class properties are reserved for the environment contract
(`EnvironmentVariables`) and static constants.

### NestJS class suffixes

| Role        | Class                                                         | File                                                       |
| ----------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| Module      | `StudentsModule`                                              | `students.module.ts`                                       |
| Controller  | `StudentsController`                                          | `students.controller.ts`                                   |
| Service     | `StudentsService`                                             | `students.service.ts`                                      |
| Repository  | `StudentsRepository` (interface), `DrizzleStudentsRepository` | `students.repository.ts`, `students.repository.drizzle.ts` |
| DTO         | `CreateStudentDto`                                            | `dto/create-student.dto.ts`                                |
| Entity      | `Student`                                                     | `student.entity.ts`                                        |
| Guard       | `RolesGuard`                                                  | `roles.guard.ts`                                           |
| Interceptor | `TimeoutInterceptor`                                          | `timeout.interceptor.ts`                                   |
| Pipe        | `ParseDossierNumberPipe`                                      | `parse-dossier-number.pipe.ts`                             |
| Filter      | `AllExceptionsFilter`                                         | `all-exceptions.filter.ts`                                 |
| Middleware  | `RequestIdMiddleware`                                         | `request-id.middleware.ts`                                 |
| Decorator   | `CurrentUser`                                                 | `current-user.decorator.ts`                                |
| Error       | `StudentNotFoundError`                                        | `students.errors.ts`                                       |
| Config      | `appConfig` (namespace)                                       | `app.config.ts`                                            |

Modules, controllers, services and repositories take the **plural** of the
resource (`StudentsService`); entities and DTOs the **singular**
(`Student`, `CreateStudentDto`).

### Files, folders, tests

| Element   | Case                                | Example                                                                  |
| --------- | ----------------------------------- | ------------------------------------------------------------------------ |
| File      | `kebab-case.role.ts`                | `sheet-recipients.service.ts`, `user-role.enum.ts`, `clock.interface.ts` |
| Folder    | `kebab-case`, plural for a module   | `modules/sheet-recipients/`                                              |
| Unit test | `*.spec.ts`, next to the file       | `students.service.spec.ts`                                               |
| E2E test  | `test/*.e2e-spec.ts`                | `students.e2e-spec.ts`                                                   |
| Test name | a sentence describing the behaviour | `it('rejects a duplicate internal id')`                                  |

### HTTP API

| Element                     | Case                      | Example                                     |
| --------------------------- | ------------------------- | ------------------------------------------- |
| Route segment               | `kebab-case`, plural noun | `/api/v1/sheet-recipients`                  |
| Route parameter             | `camelCase`               | `/students/:studentId`                      |
| Query parameter, JSON field | `camelCase`               | `?classGroup=CE2`, `{ "firstName": "Léa" }` |

### Database

| Element              | Case                               | Example                                |
| -------------------- | ---------------------------------- | -------------------------------------- |
| Table                | `snake_case`, plural               | `sheet_recipients`                     |
| Column               | `snake_case` (from camelCase keys) | `class_group`                          |
| Drizzle table object | `camelCase`, plural                | `sheetRecipients`                      |
| PostgreSQL enum type | `snake_case`, singular             | `user_role`                            |
| Drizzle enum object  | `camelCase`, singular              | `userRole`                             |
| Enum value           | `lower_snake_case`                 | `super_admin`                          |
| Index, constraint    | `<table>_<columns>_<kind>`         | `users_email_uq`, `students_class_idx` |
| Migration            | `<NNNN>_<snake_case_subject>.sql`  | `0004_student_import.sql`              |

## Code style

- No em dash anywhere.
- Comments are short and say what the code cannot: a non-obvious constraint,
  a rejected alternative, an ordering that matters.
- Prettier formats, ESLint checks. Never hand-format.

## Checks

Before committing and before opening a pull request:

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e   # when a controller, a DTO, bootstrap.ts, a migration or the schema changed
```
