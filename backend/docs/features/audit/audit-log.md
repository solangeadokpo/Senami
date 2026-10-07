# Audit log (P3)

Requirements: NF-02 (audit trail of administration actions), 2FA-04 (second
factor reset audited), INS-01 later.

## Purpose

Keep a trace that nobody can alter of who did what in administration: who
reset a second factor, who revoked a user's sessions, and tomorrow who invited,
deactivated or suspended. The table exists since the initial schema
(`audit_logs`, append-only by trigger); this adds the one way to write to it.

## Behaviour

- `AuditService.record(entry)`, exported by `AuditModule`, writes one row of
  `audit_logs`:

  ```ts
  await this.audit.record({
    action: AuditAction.TOTP_RESET,
    actor: user, // AuthenticatedUser, or null for the system
    target: { type: 'user', id: userId },
    establishmentId: target.establishmentId,
    details: { reason: 'lost_device' },
    client: { ipAddress, userAgent }, // from @ClientInfo()
  });
  ```

- `action` comes from the `AuditAction` enum (`src/shared/enums/`); the
  `audit_logs.action` column is typed from it. First values:
  `sessions_revoked`, `totp_enrolled`, `totp_locked`, `totp_reset`,
  `recovery_code_used`.
- `actor` fills `actor_user_id` and `actor_role`; `null` means the system.
- `details` never holds a secret, a password, a code, a token, nor any
  content of an accident sheet: identifiers and reasons only.
- `@ClientInfo()` (`src/shared/decorators/`) gives a controller the client IP
  address (behind the proxy, `trust proxy` is set) and user agent, passed to
  the service that audits. The IP address is kept in the audit log, not in the
  application logs.
- The row is written in the same transaction as the action when the action
  is a database change, so that a rolled back action leaves no trace and a
  committed one always does.
- Reading the log (back office screen) is out of scope.

## Affected areas

- `src/database/schema/audit.ts`: `action` typed `AuditAction` (no migration:
  the column stays text).
- `src/modules/modules.module.ts`: registers `AuditModule`.
- `docs/database.md`: who writes `audit_logs`.

## New files

| File                                                                               | Purpose                                     |
| ---------------------------------------------------------------------------------- | ------------------------------------------- |
| `src/modules/audit/audit.module.ts`                                                | exports `AuditService`                      |
| `src/modules/audit/services/audit.service.ts`                                      | `record()`                                  |
| `src/modules/audit/repositories/audit.repository.ts` (+ `.drizzle.ts`, `.fake.ts`) | insert, inside a transaction when given one |
| `src/shared/enums/audit-action.enum.ts`                                            | the audited actions                         |
| `src/shared/decorators/client-info.decorator.ts`                                   | IP address and user agent                   |
| `src/shared/interfaces/client-details.interface.ts`                                | `ClientDetails`, its type                   |

## Tests

- `audit.service.spec.ts`: records actor, role, target, establishment,
  details and client; a system action has no actor.
- `client-info.decorator.spec.ts`: reads the IP address and user agent;
  missing values are null.
- End-to-end, through F2: a second factor reset leaves one row with the super
  admin as actor and the user as target; an attempt to update or delete the
  row is refused by the database.

## Out of scope

- A back office screen to read and filter the log.
- Retention (to be fixed with the client, proposed: 1 year).
