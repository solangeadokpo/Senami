# Sheet recipients (F5)

Requirements: ETB-03 (main recipient and copies of the sheet), DEC-04 (the
sheet is emailed to the recipients), MOB-07 and RG-03 (an establishment
without a main recipient cannot declare).
Depends on: [establishments](../establishments/establishments.md) (the
creation adds the first recipient), [audit log](../audit/audit-log.md).

## Purpose

Let the responsable choose who receives the accident sheets of their
establishment: the main recipients (`to`), the copies (`cc`) and the blind
copies (`bcc`). The sheet email of F9 reads these lists; nothing else does.

## Data model

One row per establishment, three lists of emails. This replaces the one row
per address of the initial schema.

```
sheet_recipients
├── establishment_id  uuid PK → establishments.id (ON DELETE CASCADE)
├── to_emails         citext[] NOT NULL, CHECK cardinality(to_emails) >= 1
├── cc_emails         citext[] NOT NULL DEFAULT '{}'
├── bcc_emails        citext[] NOT NULL DEFAULT '{}'
├── created_at, updated_at
└── row level security tenant_isolation, forced (unchanged)
```

- `establishment_id` is the primary key: one row per establishment, no
  separate `id`.
- `to` is a reserved word in SQL, hence the `_emails` suffix.
- The column `label` and the PostgreSQL enum `recipient_type` (with
  `RecipientType`) go: nothing uses them any more.
- The database guarantees at least one main recipient (check constraint),
  the isolation (row level security) and the comparison regardless of case
  (`citext`). The service checks what a check constraint cannot express on
  array elements: the email format and the duplicates.

### Migration

`pnpm db:generate --name=sheet_recipients_as_lists`, then completed by hand
so that no recipient is lost, in one migration:

1. rename the current table;
2. create the new one (generated DDL);
3. copy the rows, one per establishment:
   `array_agg(email) FILTER (WHERE recipient_type = 'to')`, and the same
   for `cc` and `bcc`; an establishment whose rows have no `to` gets the
   email of its responsable as `to`;
4. add a row for every establishment that has none, with the email of its
   responsable (the earliest created) as `to`; an establishment without a
   responsable is left without a row;
5. drop the old table and the `recipient_type` type;
6. `FORCE ROW LEVEL SECURITY` on the new table.

## Endpoints

| Method and path         | Who                                           | Channel                | What                     |
| ----------------------- | --------------------------------------------- | ---------------------- | ------------------------ |
| `GET /sheet-recipients` | responsable, intervenant of the establishment | mobile and back office | the three lists          |
| `PUT /sheet-recipients` | responsable                                   | back office            | replaces the three lists |

The establishment is the one of the authenticated user (`withTenant`),
never a parameter. The super administrator has no establishment: 403
`ROLE_NOT_ALLOWED`, as for the other establishment routes.

The intervenant reads the lists because the summary of step 6 of the
declaration shows the recipients (mobile app).

## Behaviour

### Reading

```json
GET /api/v1/sheet-recipients
200 { "data": {
  "to": ["direction@saint-denis.fr"],
  "cc": ["infirmerie@saint-denis.fr"],
  "bcc": [],
  "updatedAt": "2026-10-10T14:32:00.000Z"
} }
```

Emails are returned in the order they were saved. An establishment without
a row (only one created before the migration and without a responsable)
reads as three empty lists and `updatedAt: null`.

### Replacing

```json
PUT /api/v1/sheet-recipients
{ "to": ["direction@saint-denis.fr"], "cc": ["infirmerie@saint-denis.fr"], "bcc": [] }
200 { "data": { "to": [...], "cc": [...], "bcc": [], "updatedAt": "..." } }
```

- The three fields are required arrays of emails (`cc` and `bcc` may be
  empty). Each email is trimmed, then checked (`IsEmail`, 254 characters at
  most). The case typed is kept; comparisons ignore it.
- No cap on the number of addresses for now.
- The row is inserted when missing, replaced otherwise, in one transaction
  with the audit.
- When nothing changed (same lists, same order, case ignored), nothing is
  written nor audited: the current lists are returned.
- Audit `sheet_recipients_updated`, target the establishment, details: the
  lists that changed and the counts after the change, never an email
  (`{ "changed": ["cc"], "counts": { "to": 1, "cc": 2, "bcc": 0 } }`).

### Errors

| Case                                               | Status | Code                                                     |
| -------------------------------------------------- | ------ | -------------------------------------------------------- |
| a field missing, not an array, or an invalid email | 400    | `VALIDATION_FAILED`, `fields`                            |
| `to` empty                                         | 422    | `NO_PRIMARY_RECIPIENT`                                   |
| the same email twice, in one list or in two lists  | 422    | `RECIPIENT_EMAIL_DUPLICATED`, `details: { list, index }` |
| an intervenant writing, a super admin              | 403    | `ROLE_NOT_ALLOWED`                                       |
| a mobile token writing                             | 403    | `CHANNEL_NOT_ALLOWED`                                    |

`details` of a duplicate names the list (`to`, `cc`, `bcc`) and the index
of the second occurrence, so that the back office marks the right chip; the
email itself stays out of the error body and the logs.

### Creation of an establishment (change to F4)

`EstablishmentsService.create()` adds, in its unit of work, the row with
`to: [responsable email]`, through `SheetRecipientsService.initialise()`.
A rolled back creation leaves no row. Changing the responsable's email later
does not change the recipients: they are two separate settings.

### For F9

`SheetRecipientsService` is exported; F9 reads the lists through it.
"May this establishment declare" (MOB-07, RG-03) requires at least one
`to`; with the check constraint, every existing row satisfies it, so the
rule only refuses an establishment without a row.

### Tenant scope inside a running transaction

`withTenant()` opens its own transaction, but the creation (F4) and the
replacement write in the transaction of a `UnitOfWork`. A new helper of
`core/database/tenant.ts`, `enterTenant(executor, establishmentId)`, runs
`set_config('app.establishment_id', ..., true)` in the given transaction;
the repository calls it before touching `sheet_recipients`.

## Affected areas

- `src/database/schema/establishment-data.ts`: the new `sheetRecipients`.
- `src/database/schema/enums.ts`, `src/shared/enums/recipient-type.enum.ts`:
  removed.
- `src/shared/enums/audit-action.enum.ts`: `SHEET_RECIPIENTS_UPDATED`.
- `src/core/database/tenant.ts`: `enterTenant()`.
- `src/modules/establishments/`: the creation initialises the recipients;
  the module imports `SheetRecipientsModule`.
- `src/modules/modules.module.ts`: registers `SheetRecipientsModule`.
- `src/database/seeds/seeders/demo-establishment.seeder.ts`: the demo row.
- `docs/database.md`, `docs/database.puml` (and the SVG).

## New files

| File                                                                                                     | Purpose                                                 |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `drizzle/0005_sheet_recipients_as_lists.sql`                                                             | the migration above                                     |
| `src/modules/sheet-recipients/sheet-recipients.module.ts`                                                | exports `SheetRecipientsService`                        |
| `src/modules/sheet-recipients/sheet-recipients.errors.ts`                                                | `NO_PRIMARY_RECIPIENT`, `RECIPIENT_EMAIL_DUPLICATED`    |
| `src/modules/sheet-recipients/recipient-list.enum.ts`                                                    | `to`, `cc`, `bcc`: the lists named in errors and audits |
| `src/modules/sheet-recipients/controllers/sheet-recipients.controller.ts`                                | `GET`, `PUT`                                            |
| `src/modules/sheet-recipients/services/sheet-recipients.service.ts` (+ `.spec.ts`)                       | read, replace, initialise                               |
| `src/modules/sheet-recipients/repositories/sheet-recipients.repository.ts` (+ `.drizzle.ts`, `.fake.ts`) | one row per establishment, under the tenant             |
| `src/modules/sheet-recipients/dto/update-sheet-recipients.dto.ts`                                        | the body of `PUT`                                       |
| `src/modules/sheet-recipients/dto/sheet-recipients-response.dto.ts`                                      | the three lists and `updatedAt`                         |
| `test/sheet-recipients.e2e-spec.ts`                                                                      | end-to-end                                              |

## Tests

Unit (service, fake repository):

- reads the lists of the user's establishment; three empty lists without a
  row;
- replaces the lists and records one audit with the changed lists and the
  counts, no email;
- an unchanged replacement (case ignored) writes nothing and records no
  audit;
- refuses an empty `to` (`NO_PRIMARY_RECIPIENT`);
- refuses a duplicate in one list and across two lists, case ignored,
  naming the list and the index (`RECIPIENT_EMAIL_DUPLICATED`);
- keeps the case typed (the DTO trims the emails);
- initialises the row with the responsable's email;
- the creation of an establishment (F4) initialises it in its unit of work.

End-to-end:

- a responsable reads, replaces (emails trimmed), reads again what they
  saved; the audit row holds the changed lists and the counts;
- an intervenant reads (mobile token) but cannot write (403); a mobile token
  of a responsable cannot write (`CHANNEL_NOT_ALLOWED`); a super admin is
  refused;
- a responsable never sees another establishment's lists (row level
  security);
- an invalid email answers 400 with the field; an empty `to` and a
  duplicate answer 422, the duplicate email absent from the body;
- the creation of an establishment (F4) leaves a row with the responsable's
  email as `to`;
- the database refuses a row with an empty `to_emails`
  (`database-guarantees.e2e-spec.ts`).

Checked by hand on the development database: the migration carries the demo
row over and gives a `to` to an establishment that had none.

## Out of scope

- The sheet email itself (F9) and the preview of the sheet (waits for the
  PDF of F9).
- A cap on the number of recipients.
- Seeing or editing the recipients from the super admin's establishment
  detail.
- Notifying the responsable when the recipients change.
