# Seeders

## Purpose

Give every environment its first super administrator, so that the back office
can be reached at all, and give development and acceptance testing a ready
establishment with a responsable and an intervenant who can sign in, without
creating them by hand in the database.

## Behaviour

### Levels

| Level       | Creates                                  | Environments                                                       | Command (development)    |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| `bootstrap` | the first super administrator            | all, production included                                           | `pnpm db:seed:bootstrap` |
| `demo`      | plan, establishment, subscription, users | development and acceptance; **refused when `NODE_ENV=production`** | `pnpm db:seed:demo`      |
| `all`       | both, `bootstrap` first                  | as `demo`                                                          | `pnpm db:seed`           |

In development the seeds run from the TypeScript sources with `tsx`, which
resolves the path aliases. Elsewhere the compiled files run from the same
image as the API, after the migrations:

```bash
docker run --rm -e DATABASE_URL=... -e SEED_SUPER_ADMIN_EMAIL=... \
  -e SEED_SUPER_ADMIN_PASSWORD=... senami-api node dist/database/seeds/seed.js bootstrap
```

### Idempotence

Every seeder creates what is missing and **never changes what exists**: a
second run creates nothing and changes no password. Each seeder runs in its
own transaction.

| Record              | Recognised by                                |
| ------------------- | -------------------------------------------- |
| super administrator | `SEED_SUPER_ADMIN_EMAIL`                     |
| plan                | code `yearly`                                |
| price               | plan and `valid_from`                        |
| demo establishment  | a fixed UUID, constant of the seeder         |
| its subscription    | the establishment (one current subscription) |
| demo users          | their email                                  |
| recipient, contacts | establishment and email, or label            |

### Data

**Super administrator**: role `UserRole.SUPER_ADMIN`, no establishment,
status `UserStatus.ACTIVE`, password hashed with `PasswordHasherService`
(argon2id). Name from `SEED_SUPER_ADMIN_FIRST_NAME` and
`SEED_SUPER_ADMIN_LAST_NAME`, default `Super` `Admin`. The second factor is
enrolled at the first back office sign-in (F2).

**Plan**: code `yearly`, name `Annuel`, billed every year (`year` x 1).
One price, 99,00 EUR from 2026-01-01, **a placeholder until the client sets
the price**.

**Demo establishment** (`is_demo = true`: no real email, out of the
statistics, reusable as the store review account in F19):

| Field        | Value                                                                          |
| ------------ | ------------------------------------------------------------------------------ |
| name         | `École de démonstration Senami`                                                |
| type         | `EstablishmentType.PRIMAIRE`                                                   |
| address      | `1 rue de la Démonstration`, `75001` `Paris`                                   |
| email        | `contact@demo.senami.fr`                                                       |
| status       | `EstablishmentStatus.ACTIVE`                                                   |
| subscription | `SubscriptionStatus.ACTIVE`, one year from the seed run, on the `yearly` price |

| User             | Role                   | Email                        |
| ---------------- | ---------------------- | ---------------------------- |
| Responsable Démo | `UserRole.RESPONSABLE` | `responsable@demo.senami.fr` |
| Intervenant Démo | `UserRole.INTERVENANT` | `intervenant@demo.senami.fr` |

Both active, with the password `SEED_DEMO_PASSWORD`.

Sheet recipient: `responsable@demo.senami.fr` as `RecipientType.TO`, so that
a declaration can be sent. Useful contacts: `SAMU` 15
(`ContactCategory.SAMU`), `Urgences` 112 (`ContactCategory.EMERGENCY`),
`Direction` 01 00 00 00 00 (`ContactCategory.DIRECTION`). Both tables are under
row level security: written through `asSuperAdmin()`.

### Environment

Declared and validated in `src/config/env.validation.ts`, like every other
variable; the level decides which set is required.

| Variable                                                    | Level       | Rule                   |
| ----------------------------------------------------------- | ----------- | ---------------------- |
| `DATABASE_URL`, `NODE_ENV`, `LOG_*`                         | all         | as for the migrations  |
| `SEED_SUPER_ADMIN_EMAIL`                                    | `bootstrap` | email                  |
| `SEED_SUPER_ADMIN_PASSWORD`                                 | `bootstrap` | at least 12 characters |
| `SEED_SUPER_ADMIN_FIRST_NAME`, `SEED_SUPER_ADMIN_LAST_NAME` | `bootstrap` | optional               |
| `SEED_DEMO_PASSWORD`                                        | `demo`      | at least 12 characters |

No password in the code, in git or in the logs. `.env.example` holds
placeholders only.

### Output

One log line per record, `created` or `already present`, with its email or
code; never a password. Exit code 1, with the reason, on an invalid
environment, an unknown level, or `demo` in production.

## Affected areas

- `package.json`: scripts, `tsx` as a development dependency.
- `src/config/env.validation.ts`: the two seed environments.
- `docs/database.md`: how and when to seed.

## Tests

Unit (`env.validation.spec.ts`):

- the bootstrap environment requires the super admin email and password,
  and rejects a password shorter than 12 characters;
- the demo environment requires the demo password.

Unit (`seed-runner.spec.ts`):

- each level is parsed, `all` by default; an unknown level is refused;
- `demo` and `all` are refused when `NODE_ENV` is `production`; `bootstrap` is
  accepted;
- `bootstrap` runs the super admin seeder only, `demo` the plan before the
  establishment, and `all` validates every variable before seeding anything.

End-to-end (`test/seeds.e2e-spec.ts`, on the test database):

- `all` creates the super admin, the plan, the demo establishment with its
  subscription, recipient and contacts, and both users;
- a second run creates nothing more and keeps the existing passwords;
- the demo responsable and intervenant can sign in on the mobile app;
- the super admin has no establishment and cannot sign in on the mobile app
  (`CHANNEL_NOT_ALLOWED`).

## Dependencies

- [Authentication and sessions](../auth/authentication-and-sessions.md):
  `PasswordHasherService`, the enums, the sign-in used by the tests.
- `asSuperAdmin()` for the tables under row level security.

## Out of scope

- Creating the super admin as "invited" with an activation link: needs the
  invitation (F3) and the email sending (P4); the environment password is the
  first step.
- The store review account itself (F19), which will reuse the demo
  establishment.
- Reference values: already loaded by a migration.
