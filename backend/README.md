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
cp .env.example .env  # then set the secrets: see "Environment" below
pnpm db:up            # PostgreSQL 16 in Docker, on localhost:5433
pnpm db:migrate       # schema, functions, row level security, reference data
pnpm db:seed          # super admin and demo establishment: see "Test accounts"
pnpm start:dev
```

### Environment

`.env.example` holds placeholders. Before the first start, replace in `.env`:

| Variable                    | What to put                                              |
| --------------------------- | -------------------------------------------------------- |
| `JWT_SECRET`                | a random value of 32 characters or more (command below)  |
| `TOTP_ENCRYPTION_KEY`       | 32 random bytes in base64 (command below)                |
| `SEED_SUPER_ADMIN_EMAIL`    | the email of your local super administrator              |
| `SEED_SUPER_ADMIN_PASSWORD` | its password, 12 characters or more                      |
| `SEED_DEMO_PASSWORD`        | the password of the demo accounts, 12 characters or more |

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))" # JWT_SECRET
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"    # TOTP_ENCRYPTION_KEY
```

`TOTP_ENCRYPTION_KEY` encrypts the second factor secrets: changing it makes
every enrolled user unable to sign in on the back office until a reset.

The API refuses to start, and the seeds to run, while a variable is missing
or too short: the error names it. `.env` is never committed; each developer
chooses their own values.

### Test accounts

`pnpm db:seed` creates these accounts in your local database. It can run
again at any time: it creates what is missing and never changes an existing
account, so changing a `SEED_*` password afterwards has no effect on an
account already created (drop the database volume with `docker compose down -v`
at the repository root to start over).

| Account             | Email                         | Password                         | Can sign in on             |
| ------------------- | ----------------------------- | -------------------------------- | -------------------------- |
| Super administrator | your `SEED_SUPER_ADMIN_EMAIL` | your `SEED_SUPER_ADMIN_PASSWORD` | back office only           |
| Responsable         | `responsable@demo.senami.fr`  | your `SEED_DEMO_PASSWORD`        | mobile app and back office |
| Intervenant         | `intervenant@demo.senami.fr`  | your `SEED_DEMO_PASSWORD`        | mobile app only            |

The responsable and the intervenant belong to the **École de démonstration
Senami**, a demo establishment (`is_demo`) with an active yearly subscription,
a sheet recipient and the SAMU, emergency and direction contacts: a
declaration can be sent from it right away.

The back office asks for a second factor (TOTP). At the first sign-in of an
account, scan the QR code drawn from `otpauthUrl` with an authenticator app
(or type `secret` in it), confirm with a code, and keep the ten recovery
codes. From the API:

```bash
# 1. password: returns step and challengeToken (valid 5 minutes)
curl -X POST http://localhost:3000/api/v1/auth/backoffice/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"responsable@demo.senami.fr","password":"<SEED_DEMO_PASSWORD>"}'
# 2a. step totp_enrolment: get the secret, then confirm with a code
curl -X POST http://localhost:3000/api/v1/auth/backoffice/totp/enrolment \
  -H 'Content-Type: application/json' -d '{"challengeToken":"<challengeToken>"}'
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/backoffice/totp/enrolment/confirm \
  -H 'Content-Type: application/json' -d '{"challengeToken":"<challengeToken>","code":"<6 digits>"}'
# 2b. step totp_verification: send the code
curl -c cookies.txt -X POST http://localhost:3000/api/v1/auth/backoffice/totp/verify \
  -H 'Content-Type: application/json' -d '{"challengeToken":"<challengeToken>","code":"<6 digits>"}'
# 3. the senami_session cookie authenticates the next calls
curl -b cookies.txt http://localhost:3000/api/v1/auth/me
```

A lost authenticator: sign in with a recovery code
(`POST /auth/backoffice/totp/recovery`), or have the super administrator
reset the second factor (`POST /users/:userId/totp/reset`). To start over
locally, drop the database volume.

Sign in on the mobile app from the API:

```bash
curl -X POST http://localhost:3000/api/v1/auth/mobile/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"intervenant@demo.senami.fr","password":"<SEED_DEMO_PASSWORD>","device":{"id":"my-laptop","platform":"ios","appVersion":"1.0.0"}}'
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

## Docker

The [`Dockerfile`](Dockerfile) builds the production image in four stages
(base, build, production dependencies, runtime). The runtime image holds the
compiled code, the production dependencies and the migrations only; it runs
as the unprivileged `node` user behind `tini`, with a health check on
`/health/live`.

The local stack is described in the
[`docker-compose.yml`](../docker-compose.yml) at the repository root, shared
with the web app (see the [root README](../README.md#docker)). The scripts
below act on the API part of it:

```bash
pnpm docker:up       # PostgreSQL, migrations, then the API on localhost:3000
pnpm docker:logs
pnpm docker:down
```

The API runs with `NODE_ENV=production` in the stack, so the OpenAPI
documentation is off: use `pnpm start:dev` for day-to-day work. Change the
host port with `API_PORT=3100 pnpm docker:up`.

In any other environment, run the migrations before starting a new version
of the API, with the same image:

```bash
docker run --rm -e DATABASE_URL=... senami-api node dist/database/migrate.js
```

## Scripts

| Script                           | What it does                                           |
| -------------------------------- | ------------------------------------------------------ |
| `pnpm start:dev`                 | start with watch mode                                  |
| `pnpm build`                     | compile to `dist/`                                     |
| `pnpm start:prod`                | run the compiled build                                 |
| `pnpm test`                      | unit tests (no database)                               |
| `pnpm test:e2e`                  | end-to-end tests (migrates `senami_test` first)        |
| `pnpm test:cov`                  | unit tests with coverage                               |
| `pnpm lint` / `lint:fix`         | ESLint with type information                           |
| `pnpm typecheck`                 | `tsc --noEmit`                                         |
| `pnpm format`                    | Prettier                                               |
| `pnpm db:up` / `db:down`         | start / stop the local PostgreSQL (root compose file)  |
| `pnpm db:generate`               | create a migration from the schema diff                |
| `pnpm db:migrate`                | apply pending migrations                               |
| `pnpm db:migrate:test`           | apply pending migrations to the test database          |
| `pnpm db:migrate:prod`           | apply migrations from the build (no drizzle-kit)       |
| `pnpm docker:up` / `docker:down` | start / stop PostgreSQL, migrations and the API        |
| `pnpm db:seed`                   | seed super admin and demo data (`:bootstrap`, `:demo`) |
| `pnpm db:studio`                 | browse the database (Drizzle Studio)                   |

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
