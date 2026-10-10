# Back office authentication and second factor (F2)

Requirements: 2FA-01 (second factor mandatory for the responsable and the
super administrator on the back office), 2FA-02 (TOTP, QR code enrolment at
the first sign-in), 2FA-03 (10 single-use recovery codes), 2FA-04 (reset by
the super administrator, audited), 2FA-05 (temporary lock after 5 wrong
codes), ETB-09, SA-06.

## Purpose

Open the back office to the responsable and the super administrator, always
behind a second factor, and end the sign-in with the session cookie the
`AuthGuard` of F1 already accepts. Let the super administrator reset a lost
second factor, and keep a trace of it.

## Behaviour

### Sign-in flow

```
POST /auth/backoffice/login            email + password
  ├─ second factor enrolled ─────────▶ POST /auth/backoffice/totp/verify     code
  │                                  └▶ POST /auth/backoffice/totp/recovery   recovery code
  └─ not enrolled yet (first sign-in) ▶ POST /auth/backoffice/totp/enrolment  QR code data
                                     ▶ POST /auth/backoffice/totp/enrolment/confirm  code
                                                                    │
                                     session cookie set ◀───────────┘
```

The password step never opens a session. It returns a **challenge token**: a
JWT valid 5 minutes, carrying the user id and the expected step
(`totp_verification` or `totp_enrolment`), refused by every other endpoint.
The cookie is set only once the second factor is proven.

### Endpoints

All under `/api/v1`, public (the challenge token is the credential), errors in
the usual `{ "error": ... }` shape.

**`POST /auth/backoffice/login`**, 10 attempts per minute per IP and email.

```json
{ "email": "responsable@demo.senami.fr", "password": "..." }
```

200:

```json
{
  "data": {
    "step": "totp_verification",
    "challengeToken": "eyJ...",
    "challengeExpiresAt": "2026-10-07T09:05:00.000Z"
  }
}
```

`step` is `totp_enrolment` when the user has no enrolled second factor.

| Failure                             | Status | Code                                 |
| ----------------------------------- | ------ | ------------------------------------ |
| unknown email or wrong password     | 401    | `INVALID_CREDENTIALS`                |
| invitation not accepted             | 401    | `ACCOUNT_NOT_ACTIVATED`              |
| user deactivated                    | 401    | `ACCOUNT_DEACTIVATED`                |
| intervenant (no back office access) | 403    | `CHANNEL_NOT_ALLOWED`                |
| establishment suspended             | 403    | `ESTABLISHMENT_SUSPENDED`            |
| second factor locked (2FA-05)       | 403    | `TOTP_LOCKED`, `details.lockedUntil` |
| too many attempts                   | 429    | `RATE_LIMITED`                       |

Same rules as the mobile sign-in: the password is checked first, an unknown
email costs the same time, account states are disclosed only to someone who
knows the password. A suspended subscription does not block the back office
(PAY-05).

**`POST /auth/backoffice/totp/enrolment`**: `{ "challengeToken": "..." }`
(step `totp_enrolment`). Generates a new secret, stores it encrypted, not yet
active.

```json
{
  "data": {
    "otpauthUrl": "otpauth://totp/Senami:responsable%40demo.senami.fr?secret=JBSW...&issuer=Senami&algorithm=SHA1&digits=6&period=30",
    "secret": "JBSWY3DPEHPK3PXP"
  }
}
```

The back office draws the QR code from `otpauthUrl`; `secret` is for manual
entry. Calling it again replaces a secret not yet confirmed.

**`POST /auth/backoffice/totp/enrolment/confirm`**:
`{ "challengeToken": "...", "code": "123456" }`. Activates the second factor,
generates the 10 recovery codes, opens the session.

```json
{
  "data": {
    "recoveryCodes": ["K7Q2M-9XWPA", "..."],
    "user": {
      "id": "...",
      "email": "...",
      "firstName": "...",
      "lastName": "...",
      "role": "responsable",
      "establishment": { "id": "...", "name": "..." }
    }
  }
}
```

The recovery codes are shown **once**: only their hashes are kept.

**`POST /auth/backoffice/totp/verify`**: `{ "challengeToken": "...", "code": "123456" }`.
Opens the session; 200 with `{ "data": { "user": { ... } } }`.

**`POST /auth/backoffice/totp/recovery`**:
`{ "challengeToken": "...", "recoveryCode": "K7Q2M-9XWPA" }`. Same as verify,
with a recovery code, which is then spent. The response adds
`remainingRecoveryCodes`.

Failures of the four second factor endpoints:

| Failure                                                           | Status        | Code                                 |
| ----------------------------------------------------------------- | ------------- | ------------------------------------ |
| challenge token invalid, expired, or of another step              | 401           | `INVALID_CHALLENGE`                  |
| wrong code or recovery code                                       | 401           | `INVALID_TOTP_CODE`                  |
| fifth wrong code: locked 15 minutes                               | 403           | `TOTP_LOCKED`, `details.lockedUntil` |
| enrolment requested while already enrolled                        | 409           | `TOTP_ALREADY_ENROLLED`              |
| verification requested while not enrolled                         | 409           | `TOTP_NOT_ENROLLED`                  |
| account, channel or establishment refused since the password step | as at sign-in | as at sign-in                        |

A successful code resets the failure count.

**Session cookie**: `senami_session`, opaque random token stored as a SHA-256
hash in `auth_sessions` (channel `backoffice`), `HttpOnly`, `SameSite=Lax`,
`Path=/`, `Secure` outside development and test, expires 12 hours after the
sign-in (`BACKOFFICE_SESSION_HOURS`), not extended. A state-changing request
must come from an origin of `CORS_ORIGINS` (F1 guard). `POST /auth/logout`
also clears the cookie.

**`POST /users/:userId/totp/reset`** (`UserRole.SUPER_ADMIN`), 204. Erases the
secret, the recovery codes, the failure count and the lock, and revokes the
user's back office sessions: the next sign-in goes through enrolment again
(2FA-04). Unknown user: 404 `USER_NOT_FOUND`. Audited.

### Channel of a route

A route meant for one channel says so, and the guard refuses the other one
with 403 `CHANNEL_NOT_ALLOWED`:

```ts
@Channels(SessionChannel.BACKOFFICE)
@Roles(UserRole.RESPONSABLE, UserRole.SUPER_ADMIN)
```

Without it, a responsable signed in on the mobile app with their password
only could call the administration routes and skip the second factor. Every
back office route carries `@Channels(SessionChannel.BACKOFFICE)`, every mobile
route `@Channels(SessionChannel.MOBILE)`; the routes common to both (`me`,
`logout`, own sessions) carry none. `DELETE /users/:userId/sessions` and
`POST /users/:userId/totp/reset` become back office only.

### Writing several rows at once

An action and its audit row are written in one transaction: a service runs
them through the `UnitOfWork` (`UNIT_OF_WORK`), which hands an opaque
`TransactionScope` to the repositories. Services never see Drizzle; the
Drizzle repositories turn the scope back into the transaction. Used by the
enrolment confirmation, the verification, the recovery, the lock, the reset,
and the F1 revocation of a user's sessions.

### TOTP

RFC 6238 with `otpauth`: SHA-1, 6 digits, 30 seconds, one period of tolerance
on each side. Issuer `Senami`, label the user's email.

### Storage

- `users.totp_secret_encrypted`: AES-256-GCM with `TOTP_ENCRYPTION_KEY` (32
  bytes, base64), stored as nonce + tag + ciphertext. The secret never reaches
  the logs.
- `users.totp_enrolled_at`: set at confirmation; NULL means not enrolled.
- `users.totp_failed_attempts`, `users.totp_locked_until`: 2FA-05.
- `totp_recovery_codes`: 10 rows per enrolment, argon2id hash, `used_at` once
  spent. A new enrolment replaces them.

No migration: the columns and the table exist since the initial schema.

### Audit

Written through the audit service ([spec](../audit/audit-log.md)):

| Action               | When                                                       |
| -------------------- | ---------------------------------------------------------- |
| `totp_enrolled`      | a second factor is confirmed                               |
| `totp_locked`        | the fifth wrong code locks the second factor               |
| `totp_reset`         | the super administrator resets it                          |
| `recovery_code_used` | a recovery code opens a session                            |
| `sessions_revoked`   | F1: a responsable or super admin revokes a user's sessions |

## Affected areas

- `src/modules/auth/`: back office controller and services, second factor
  service, encryption, the challenge token in `TokenService`, `logout` clears
  the cookie, F1 `SessionsService` writes `sessions_revoked`.
- `src/config/`: `TOTP_ENCRYPTION_KEY`, `BACKOFFICE_SESSION_HOURS`;
  `.env.example`, `.env.test`, `docker-compose.yml`.
- `src/shared/enums/`: `AuthStep`, `AuditAction`.
- `src/shared/decorators/channels.decorator.ts`, `src/modules/auth/guards/channels.guard.ts`:
  `@Channels(...)` and its global guard.
- `src/shared/interfaces/unit-of-work.interface.ts`, `src/core/database/drizzle-unit-of-work.ts`:
  `UnitOfWork`, `TransactionScope`, provided by `DatabaseModule`.
- `src/modules/auth/services/credentials.service.ts`: the password check
  shared by the mobile and back office sign-ins.
- F1 tests: the revocation of a user's sessions is now done from the back
  office (cookie), as `@Channels` requires.
- `README.md`: back office sign-in of the test accounts.

## New files

| File                                                                             | Purpose                               |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| `src/modules/auth/controllers/backoffice-auth.controller.ts`                     | the five sign-in endpoints            |
| `src/modules/auth/controllers/totp-admin.controller.ts`                          | reset by the super administrator      |
| `src/modules/auth/services/backoffice-auth.service.ts`                           | sign-in steps, session opening        |
| `src/modules/auth/services/totp.service.ts`                                      | secrets, codes, recovery codes, lock  |
| `src/modules/auth/services/secret-cipher.service.ts`                             | AES-256-GCM                           |
| `src/modules/auth/repositories/totp.repository.ts` (+ `.drizzle.ts`, `.fake.ts`) | second factor data                    |
| `src/modules/auth/dto/backoffice-*.dto.ts`                                       | requests and responses                |
| `src/shared/enums/auth-step.enum.ts`                                             | `totp_verification`, `totp_enrolment` |

## Tests

Unit, on fake repositories and a fake clock:

- `backoffice-auth.service.spec.ts`: a responsable and a super admin get the
  step their enrolment calls for; an intervenant is refused; wrong password and
  unknown email give the same error; a suspended subscription does not block;
  a suspended establishment does; a challenge token of the wrong step, expired
  or forged is refused; verify opens a backoffice session; enrolment then
  confirmation returns 10 recovery codes and opens the session.
- `totp.service.spec.ts`: a code of the current, previous and next period is
  accepted, older is refused; the fifth wrong code locks for 15 minutes and is
  audited; a locked factor refuses even a right code until the lock ends; a
  recovery code is found whatever its case and separators, an unknown one
  counts as a failure.
- `backoffice-auth.service.spec.ts` also: a success clears the count of wrong
  codes; a recovery code works once; a reset sends the next sign-in back to
  enrolment and closes the back office sessions only.
- `secret-cipher.service.spec.ts`: round trip; a tampered ciphertext is
  refused; two encryptions of one secret differ.
- `channels.guard.spec.ts`: a route without `@Channels` admits both channels;
  a back office route refuses a mobile session.

End-to-end (`test/backoffice-auth.e2e-spec.ts`):

- first sign-in of the demo responsable: enrolment, confirmation with a code
  computed from the returned secret, cookie set, `GET /auth/me` answers
  `channel: backoffice`;
- second sign-in: verification, then a recovery code, then the same recovery
  code again is refused;
- five wrong codes lock the sign-in, the sixth attempt answers `TOTP_LOCKED`;
- the super admin resets the responsable's second factor: their session is
  revoked, the next sign-in asks for enrolment, the action is in `audit_logs`;
- the cookie has `HttpOnly` and `SameSite=Lax`; logout clears it;
- a responsable's mobile access token is refused on a back office route
  (`CHANNEL_NOT_ALLOWED`);
- neither the secret, a code, nor a recovery code appears in the logs.

## Dependencies

- [Authentication and sessions](authentication-and-sessions.md): guard,
  cookie handling, access policy, password check.
- [Audit log](../audit/audit-log.md).
- New package: `otpauth`.

## Out of scope

- Regenerating recovery codes without a reset.
- Remembering a trusted browser.
- The back office user interface (QR code drawing is done there).
- Forgotten password: after the email sending (P4).
