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
| `shared/`  | Stateless, importable anywhere. Created with the first business module.                               |
| `modules/` | Each module is registered in `modules.module.ts`, the only change outside its folder.                 |

### A business module

```
src/modules/students/
├── students.module.ts
├── students.controller.ts
├── students.service.ts
├── students.service.spec.ts
├── students.repository.ts          interface + Symbol token
├── students.repository.drizzle.ts  the only file importing Drizzle
├── students.repository.fake.ts     in-memory, for the service tests
├── students.errors.ts              DomainError subclasses of the module
└── dto/
    ├── create-student.dto.ts
    ├── update-student.dto.ts
    ├── list-students-query.dto.ts
    └── student-response.dto.ts
```

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

## Errors

- Services throw a `DomainError` subclass (`NotFoundError`, `ConflictError`,
  `InvariantViolationError`, `ForbiddenActionError`) with a stable
  SCREAMING_SNAKE_CASE `code`. A single global exception filter maps each
  family to an HTTP status. Services never throw HTTP exceptions.
- `details` may be returned to the client; `context` is logged only. Anything
  sensitive goes in `context`.
- Never `try/catch` to swallow an error. Catch the narrowest thing, and pass
  the original as `cause`. Do not catch just to log and rethrow: the filter
  logs.
- A caught value is `unknown`: narrow it, never cast it.

## API

- URI versioning (`/api/v1/...`). Health probes stay outside the prefix and
  versioning.
- Every input is a DTO validated by `class-validator`. The global
  `ValidationPipe` uses `whitelist` and `forbidNonWhitelisted`: an unknown
  field is a 400, not silently dropped.
- Responses go through a response DTO that exposes an allow-list of fields.
  Never return a database row as is.
- Four DTO shapes per resource: `create-`, `update-`, `list-<r>-query-`,
  `<r>-response-`.
- Every endpoint is protected by a guard unless explicitly public, and checks
  the role (intervenant, responsable, super admin) it requires.
- Cross-cutting concerns (logging, timeouts, response envelope) are
  interceptors, not code repeated in controllers.

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

| Element   | Case                                | Example                                 |
| --------- | ----------------------------------- | --------------------------------------- |
| File      | `kebab-case.role.ts`                | `sheet-recipients.service.ts`           |
| Folder    | `kebab-case`, plural for a module   | `modules/sheet-recipients/`             |
| Unit test | `*.spec.ts`, next to the file       | `students.service.spec.ts`              |
| E2E test  | `test/*.e2e-spec.ts`                | `students.e2e-spec.ts`                  |
| Test name | a sentence describing the behaviour | `it('rejects a duplicate internal id')` |

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
