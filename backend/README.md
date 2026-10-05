# Senami API

The backend consumed by the mobile app, the back office and the showcase site.
It authenticates users, isolates establishments, numbers declarations,
renders the accident sheet as a PDF in memory and emails it, handles
subscriptions and payments, and serves statistics.

Stack: NestJS 12 (native ESM), Drizzle ORM, PostgreSQL 16, Vitest, ESLint with
type information, Prettier.

## Getting started

Prerequisites: Node.js 24 (`.nvmrc`), pnpm 12, Docker. Run `pnpm install` once
at the repository root for the git hooks, then in this folder:

```bash
nvm use
pnpm install
cp .env.example .env
pnpm db:up            # PostgreSQL 16 in Docker, on localhost:5433
pnpm db:migrate       # schema, functions, row level security, reference data
pnpm start:dev
```

| URL                                | What                                      |
| ---------------------------------- | ----------------------------------------- |
| http://localhost:3000/api/v1       | the API                                   |
| http://localhost:3000/api/docs     | OpenAPI documentation (not in production) |
| http://localhost:3000/health/live  | liveness probe                            |
| http://localhost:3000/health/ready | readiness probe (checks the database)     |

The Docker database creates two databases owned by `senami_app`: `senami` for
development and `senami_test` for the e2e suite. The role is not a superuser
on purpose, so row level security applies locally as it does in production.

## Scripts

| Script                           | What it does                                     |
| -------------------------------- | ------------------------------------------------ |
| `pnpm start:dev`                 | start with watch mode                            |
| `pnpm build`                     | compile to `dist/`                               |
| `pnpm start:prod`                | run the compiled build                           |
| `pnpm test`                      | unit tests (no database)                         |
| `pnpm test:e2e`                  | end-to-end tests (migrates `senami_test` first)  |
| `pnpm test:cov`                  | unit tests with coverage                         |
| `pnpm lint` / `lint:fix`         | ESLint with type information                     |
| `pnpm typecheck`                 | `tsc --noEmit`                                   |
| `pnpm format`                    | Prettier                                         |
| `pnpm db:up` / `db:down`         | start / stop the local PostgreSQL                |
| `pnpm db:generate`               | create a migration from the schema diff          |
| `pnpm db:migrate`                | apply pending migrations                         |
| `pnpm db:migrate:test`           | apply pending migrations to the test database    |
| `pnpm db:migrate:prod`           | apply migrations from the build (no drizzle-kit) |
| `pnpm docker:up` / `docker:down` | start / stop the whole stack in Docker           |
| `pnpm db:studio`                 | browse the database (Drizzle Studio)             |

## Layout

```
src/
├── main.ts              process: logger, shutdown, Swagger, listen
├── bootstrap.ts         what shapes the API (prefix, versioning, validation, CORS)
├── app.module.ts
├── config/              environment contract and typed namespaces
├── core/                config, database pool, tenant helpers, health probes
├── database/schema/     Drizzle tables, one file per domain
└── modules/             business modules
drizzle/                 SQL migrations (generated and hand-written)
docs/                    database documentation, feature specs
test/                    end-to-end tests
```

## Configuration

Every variable is validated at startup and documented in
[`.env.example`](.env.example). A missing or invalid one stops the boot with
its name.

## Documentation

- [`docs/database.md`](docs/database.md): the data model, tenant isolation,
  numbering, how to change the schema.
- [`docs/conventions.md`](docs/conventions.md): structure and practices to
  follow. Read it before your first change.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md): branches, commits, checks.
