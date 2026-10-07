# Authentication and sessions (F1)

Requirements: MOB-01 (sign in), MOB-03 (long, remotely revocable session),
MOB-06 (sign out), MOB-07 and RG-03 (suspended subscription), RG-04
(deactivated user loses access at once), CDC section 3 (roles).

## Purpose

Let staff sign in to the mobile app with their email and password and stay
signed in for 30 days, while keeping the server able to cut any session at
once: a deactivated user, a suspended establishment or a revoked device must
lose access on its next request, not when a token expires. Give every
endpoint a single, declarative way to require authentication and a role.

## Tree

```
backend/
├── package.json                                (modified)  @nestjs/jwt, @nestjs/throttler, @node-rs/argon2, cookie-parser
├── .env.example, .env.test                     (modified)  JWT_SECRET, ACCESS_TOKEN_TTL_MINUTES, MOBILE_SESSION_DAYS
├── docker-compose.yml                          (modified)  JWT_SECRET for the api service
├── eslint.config.mjs                           (modified)  enum values not hard-coded, `_` prefix allowed
├── drizzle/0004_auth_session_previous_token.sql (new)     previous_refresh_token_hash
├── src/
│   ├── bootstrap.ts                            (modified)  cookie-parser
│   ├── config/
│   │   ├── auth.config.ts                      (new)       jwt secret, token and session durations
│   │   └── env.validation.ts                   (modified)  ScriptEnvironment / EnvironmentVariables
│   ├── core/
│   │   ├── core.module.ts                      (modified)  imports TimeModule
│   │   ├── health/health.controller.ts         (modified)  @Public()
│   │   └── time/                               (new)       TimeModule, SystemClock
│   ├── database/
│   │   ├── migrate.ts                          (modified)  script environment only
│   │   └── schema/                             (modified)  pgEnums built from the enums, sqlValue()
│   ├── modules/
│   │   ├── modules.module.ts                   (modified)  registers AuthModule
│   │   └── auth/                               (new)
│   │       ├── auth.module.ts, auth.errors.ts, auth.constants.ts, access-policy.ts
│   │       ├── controllers/                    auth, sessions
│   │       ├── services/                       auth, sessions, token, password-hasher
│   │       ├── guards/                         auth, roles, login-throttler
│   │       ├── repositories/                   interface, drizzle, fake
│   │       ├── dto/                            requests and responses
│   │       └── testing/                        fixtures
│   └── shared/
│       ├── decorators/                         (modified)  public, roles, current-user
│       ├── enums/                              (new)       every domain enum
│       ├── interfaces/                         (new)       authenticated-user, clock
│       └── testing/fake-clock.ts               (new)
├── test/
│   ├── app.ts                                  (modified)
│   ├── auth.e2e-spec.ts                        (new)
│   └── fixtures/accounts.ts                    (new)       establishment, subscription, users
└── docs/                                       (modified)  conventions, database, this spec
```

## Behaviour

### Channels

| Channel      | Who                          | Credential carried                                                     |
| ------------ | ---------------------------- | ---------------------------------------------------------------------- |
| `mobile`     | `intervenant`, `responsable` | `Authorization: Bearer <access token>`, refreshed with a refresh token |
| `backoffice` | `responsable`, `super_admin` | `senami_session` cookie (HttpOnly, Secure, SameSite=Lax)               |

F1 delivers the mobile sign-in and the guard for both channels. The back
office sign-in, which cannot complete without the second factor, is part of
F2.

### Tokens

- **Access token**: JWT (HS256, `JWT_SECRET`), 15 minutes
  (`ACCESS_TOKEN_TTL_MINUTES`). Claims: `sub` (user id), `sid` (session id).
  Nothing else is trusted from the token.
- **Refresh token**: 32 random bytes, base64url. Stored as a SHA-256 hash in
  `auth_sessions.refresh_token_hash`, never in clear. Rotated on every use;
  the previous hash is kept to detect a replay.
- **Session**: one row of `auth_sessions`. A mobile session expires 30 days
  after its last refresh (`MOBILE_SESSION_DAYS`, sliding). One active mobile
  session per user and device: signing in again on the same `deviceId`
  revokes the previous one.

### Every authenticated request

The global guard verifies the access token (or the cookie), then loads the
session with its user, establishment and current subscription in one query,
and refuses when:

| Situation                                                                            | Status | Code                      |
| ------------------------------------------------------------------------------------ | ------ | ------------------------- |
| no credential, invalid or expired access token                                       | 401    | `UNAUTHENTICATED`         |
| session revoked                                                                      | 401    | `SESSION_REVOKED`         |
| session expired                                                                      | 401    | `SESSION_EXPIRED`         |
| user deactivated (RG-04)                                                             | 401    | `ACCOUNT_DEACTIVATED`     |
| establishment suspended or terminated                                                | 403    | `ESTABLISHMENT_SUSPENDED` |
| subscription neither `active` nor `past_due`, **mobile only** (MOB-07, RG-03)        | 403    | `SUBSCRIPTION_SUSPENDED`  |
| role not allowed by `@Roles(...)`                                                    | 403    | `ROLE_NOT_ALLOWED`        |
| channel not open to the role (intervenant on the back office, super admin on mobile) | 403    | `CHANNEL_NOT_ALLOWED`     |
| cookie and a state-changing method from an origin outside `CORS_ORIGINS` (CSRF)      | 403    | `ORIGIN_NOT_ALLOWED`      |

Role and establishment come from the database, not from the token: a role
change applies on the next request. The back office stays open to a
responsable whose subscription is suspended, so that they can pay (PAY-05).

Routes are authenticated by default; `@Public()` opts out (health probes,
sign-in, refresh, the showcase forms later). `@CurrentUser()` gives the
handler:

```ts
interface AuthenticatedUser {
  userId: string;
  role: UserRole; // INTERVENANT, RESPONSABLE, SUPER_ADMIN
  establishmentId: string | null; // null for the super admin
  sessionId: string;
  channel: SessionChannel; // MOBILE, BACKOFFICE
}
```

### Endpoints

**`POST /api/v1/auth/mobile/login`** (public)

```json
{
  "email": "lea.martin@ecole.fr",
  "password": "...",
  "device": {
    "id": "a1b2-...",
    "name": "iPhone de Léa",
    "platform": "ios",
    "appVersion": "1.0.0"
  }
}
```

200:

```json
{
  "data": {
    "accessToken": "eyJ...",
    "accessTokenExpiresAt": "2026-10-06T10:15:00.000Z",
    "refreshToken": "q8Xv...",
    "sessionExpiresAt": "2026-11-05T10:00:00.000Z",
    "user": {
      "id": "...",
      "email": "lea.martin@ecole.fr",
      "firstName": "Léa",
      "lastName": "Martin",
      "role": "intervenant",
      "establishment": { "id": "...", "name": "École Saint-Denis" }
    }
  }
}
```

| Failure                         | Status | Code                      |
| ------------------------------- | ------ | ------------------------- |
| unknown email or wrong password | 401    | `INVALID_CREDENTIALS`     |
| invitation not accepted yet     | 401    | `ACCOUNT_NOT_ACTIVATED`   |
| user deactivated                | 401    | `ACCOUNT_DEACTIVATED`     |
| super admin (no mobile access)  | 403    | `CHANNEL_NOT_ALLOWED`     |
| establishment suspended         | 403    | `ESTABLISHMENT_SUSPENDED` |
| subscription suspended          | 403    | `SUBSCRIPTION_SUSPENDED`  |
| too many attempts               | 429    | `RATE_LIMITED`            |

The password is checked first, and an unknown email costs the same time as a
wrong password (verification against a dummy hash): neither the response nor
its timing reveals whether an account exists. Account states are only
disclosed to someone who knows the password. Sign-in updates
`users.last_login_at`.

**`POST /api/v1/auth/mobile/refresh`** (public): `{ "refreshToken": "..." }`
returns a new access token and a new refresh token, same shape as sign-in
without `user`. Re-checks user, establishment and subscription.

| Failure                                           | Status        | Code                                 |
| ------------------------------------------------- | ------------- | ------------------------------------ |
| unknown token                                     | 401           | `INVALID_REFRESH_TOKEN`              |
| token already rotated: **the session is revoked** | 401           | `REFRESH_TOKEN_REUSED`               |
| session revoked or expired                        | 401           | `SESSION_REVOKED`, `SESSION_EXPIRED` |
| account or establishment refused                  | as at sign-in | as at sign-in                        |

The app must not run two refreshes at once: the second would present a
rotated token and revoke the session.

**`POST /api/v1/auth/logout`**: revokes the current session, 204.

**`GET /api/v1/auth/me`**: the current user, as in the sign-in response, plus
`channel` and the subscription status.

**`GET /api/v1/auth/sessions`**: the caller's active sessions: `id`,
`channel`, `deviceName`, `platform`, `appVersion`, `createdAt`,
`lastUsedAt`, `current`.

**`DELETE /api/v1/auth/sessions/:sessionId`**: revokes one of the caller's
sessions, 204. Another user's session: 404 `SESSION_NOT_FOUND`.

**`DELETE /api/v1/users/:userId/sessions`** (`responsable`, `super_admin`):
revokes every active session of a user, 204 (MOB-03). A responsable reaches
only the users of their establishment; any other user is 404
`USER_NOT_FOUND`, without revealing that it exists.

### Brute force

`POST /auth/mobile/login`: 10 attempts per minute per IP address and email;
`POST /auth/mobile/refresh`: 30 per minute per IP address. Over the limit:
429 `RATE_LIMITED`. In-memory counters: enough for one instance, to move to
a shared store before scaling out.

## Affected areas

- `src/database/schema/users.ts`: `auth_sessions.previous_refresh_token_hash`
  (nullable, indexed), with its migration; `docs/database.md`,
  `docs/database.puml`.
- `src/config/`: `JWT_SECRET` (at least 32 characters), `ACCESS_TOKEN_TTL_MINUTES`
  (15), `MOBILE_SESSION_DAYS` (30); `.env.example`, `.env.test`. The variables
  are split: `ScriptEnvironment` (what the migration script needs) and
  `EnvironmentVariables` (the API), so the migration container never receives
  the token secret.
- `src/core/time/`: global `CLOCK`, injected instead of `new Date()`.
- `docker-compose.yml`: `JWT_SECRET` for the `api` service.
- `src/app.module.ts`: global `AuthGuard` and `RolesGuard`, throttler.
- `src/core/health/health.controller.ts`, `test/fixtures/probe.controller.ts`:
  `@Public()`.
- `test/fixtures/accounts.ts`: establishment, subscription, user and back
  office session fixtures.
- `eslint.config.mjs`: a variable may start with `_` (deliberately unused).

## New files

| File                                                                                           | Purpose                                                                                             |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/modules/auth/auth.module.ts`                                                              | wiring, global guards                                                                               |
| `src/modules/auth/auth.errors.ts`, `auth.constants.ts`                                         | error codes, cookie name                                                                            |
| `src/modules/auth/access-policy.ts`                                                            | who may use which channel, checked at sign-in, refresh and on every request                         |
| `src/modules/auth/controllers/auth.controller.ts`                                              | sign-in, refresh, logout, me                                                                        |
| `src/modules/auth/controllers/sessions.controller.ts`                                          | own sessions, user sessions                                                                         |
| `src/modules/auth/services/auth.service.ts`                                                    | sign-in and refresh rules                                                                           |
| `src/modules/auth/services/sessions.service.ts`                                                | listing and revocation                                                                              |
| `src/modules/auth/services/token.service.ts`                                                   | access token, refresh token generation and hash                                                     |
| `src/modules/auth/services/password-hasher.service.ts`                                         | argon2id, dummy verification                                                                        |
| `src/modules/auth/guards/auth.guard.ts`, `roles.guard.ts`                                      | global guards                                                                                       |
| `src/modules/auth/guards/login-throttler.guard.ts`                                             | sign-in attempts counted per IP and email                                                           |
| `src/modules/auth/repositories/auth.repository.ts` (+ `.drizzle.ts`, `.fake.ts`)               | users and sessions access                                                                           |
| `src/modules/auth/dto/*.dto.ts`                                                                | request and response DTOs                                                                           |
| `src/shared/decorators/public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts` | route metadata                                                                                      |
| `src/shared/interfaces/authenticated-user.interface.ts`                                        | `AuthenticatedUser`                                                                                 |
| `src/shared/interfaces/clock.interface.ts`, `src/core/time/`                                   | `Clock`, `CLOCK`, `SystemClock`                                                                     |
| `src/shared/enums/*.enum.ts`                                                                   | `UserRole`, `SessionChannel`, `UserStatus`, `DevicePlatform`, ... ; the pgEnums are built from them |

## Tests

Unit, on the fake repository:

- `auth.service.spec.ts`: signs in an active intervenant and a responsable;
  rejects a wrong password and an unknown email with the same error; rejects
  an invited user, a deactivated user, a super admin, a suspended
  establishment, a suspended subscription; accepts a `past_due` subscription;
  revokes the previous session of the same device; refreshes and rotates;
  rejects an unknown refresh token; revokes the session when a rotated token
  is replayed; rejects a revoked and an expired session; slides the
  expiry on refresh.
- `sessions.service.spec.ts`: lists only the caller's active sessions and
  flags the current one; revokes an own session; refuses another user's
  session; a responsable revokes the sessions of a user of their
  establishment and gets `USER_NOT_FOUND` for any other; a super admin
  revokes anyone's.
- `token.service.spec.ts`: an access token carries `sub` and `sid` and
  expires; a refresh token is 32 random bytes; the hash is stable.
- `password-hasher.spec.ts`: verifies the right password, rejects a wrong
  one.
- `access-policy.spec.ts`: each channel, role, account, establishment and
  subscription state.
- `auth.guard.spec.ts`, `roles.guard.spec.ts`: each row of the guard table.

End-to-end (`test/auth.e2e-spec.ts`):

- sign-in, call a protected route with the access token, refresh, sign out,
  then the token is refused;
- a deactivated user, a revoked session and a suspended subscription are
  refused on the next request, before the access token expires;
- the back office channel (cookie) is accepted by the guard and not blocked
  by a suspended subscription;
- a protected route without credential answers 401, a public one answers;
- the eleventh sign-in attempt within a minute answers 429;
- no password, access token or refresh token appears in the logs.

## Dependencies

- [Error handling](../http/error-handling-and-responses.md),
  [logging](../observability/logging.md).
- New packages: `@nestjs/jwt`, `@node-rs/argon2`, `@nestjs/throttler`,
  `cookie-parser`.

## Out of scope

- Back office sign-in and the second factor (F2).
- Forgotten password and reset: needs email sending (P4).
- Invitation acceptance and first password (F3).
- Audit entries for revocations: added with the audit service (P3).
- Account deletion from the app (F19, MOB-06).
