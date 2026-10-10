# Establishments (F4)

Requirements: SA-02 (list, detail, suspension, manual creation), ETB-03
(name, phone, address, logo of the sheet), RG-03 (a suspended establishment
loses access), 2FA-04 (second factor reset, screen of F2).
Depends on: [email sending](../email/email-sending.md),
[invitation acceptance](../users/invitation-acceptance.md).

## Purpose

Let the super administrator create an establishment with its responsable,
find it, look at it and suspend it; let the responsable keep the identity of
their establishment printed on the sheets.

## Endpoints

All `@Channels(SessionChannel.BACKOFFICE)`.

| Method and path                         | Who                          | What                                                 |
| --------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| `GET /establishments`                   | super admin                  | paginated list, filters `search`, `city`, `status`   |
| `GET /establishments/cities`            | super admin                  | the cities in use, for the filter                    |
| `POST /establishments`                  | super admin                  | creation with its responsable and its subscription   |
| `GET /establishments/:id`               | super admin, its responsable | detail                                               |
| `PATCH /establishments/:id`             | super admin, its responsable | name, address, phone, email (type: super admin only) |
| `PUT /establishments/:id/logo`          | super admin, its responsable | PNG or SVG, 512 KB at most                           |
| `DELETE /establishments/:id/logo`       | super admin, its responsable |                                                      |
| `GET /establishments/:id/logo`          | super admin, its responsable | the image, `Cache-Control: private`                  |
| `POST /establishments/:id/suspension`   | super admin                  | `{ reason }`: suspends                               |
| `DELETE /establishments/:id/suspension` | super admin                  | reactivates                                          |

A responsable reaching another establishment gets 404, as if it did not
exist.

## Behaviour

### List

Rows: name, type, city, status, responsable (name, email, invitation state:
`invited`, `active`), declarations this month, subscription status and due
date, creation date. `search` matches name and responsable email
(case-insensitive, accents ignored); `city` exact; `status` one of
`EstablishmentStatus`. Sorted by name; 20 per page, `meta: { page,
pageSize, total }`. Demo establishments are listed, marked `isDemo`.

"Declarations this month" counts `declaration_submissions` received since
the first day of the month (Europe/Paris), read as super admin: a counter,
never a sheet.

### Creation

Body: the establishment (name, type, address line, postal code, city,
optional phone, email, approximate pupil count) and its responsable (first
name, last name, email). In one transaction:

1. the establishment, `active`;
2. its subscription to the current price of the single plan, `active`, from
   now for one billing period (`yearly`: one year);
3. the responsable, `invited`, role `responsable`, created by the super
   admin;
4. the invitation (72 h);
5. audit `establishment_created`.

Then the invitation email. Answer 201 with the establishment and
`invitation: { sent, expiresAt }`: `sent: false` when the email failed, the
super admin resends it from the detail page.

Errors: 409 `USER_EMAIL_ALREADY_USED`; 422 field errors (postal code five
digits, email format, required fields); 503 `NO_CURRENT_PLAN_PRICE` when no
price applies today (configuration error).

### Detail

Everything of the list, plus address, phone, email, approximate pupil
count, logo presence, suspension date and reason, users by role and status,
the responsable's user id and second factor state (enrolled or not, for the
reset of F2).

### Update and logo

- `PATCH`: the fields of the creation but the responsable; audit
  `establishment_updated` with the names of the changed fields only.
- Logo: multipart field `logo`. PNG checked by its signature; SVG parsed and
  cleaned (no script, event attribute, `foreignObject`, external reference
  nor `data:` other than images), refused if it cannot be parsed
  (422 `LOGO_INVALID`). Over 512 KB, the upload limit answers 413
  `PAYLOAD_TOO_LARGE` before the service; other types, 422
  `LOGO_TYPE_NOT_ALLOWED` (no 415 in the error families).
  Stored in `establishments.logo` (bytea), as today.

### Suspension

- `POST .../suspension` `{ reason }` (3 to 500 characters): status
  `suspended`, `suspended_at`, `suspension_reason`. The access policy (F1)
  then refuses the establishment's users on the next request: mobile app
  and back office. Audit `establishment_suspended` with the reason.
- `DELETE .../suspension`: `active` again, suspension fields cleared. Audit
  `establishment_reactivated`.
- 409 `ESTABLISHMENT_ALREADY_SUSPENDED` / `ESTABLISHMENT_NOT_SUSPENDED`.
- The subscription is not touched (F11).

## Tests

Unit (services, fake repositories): creation in one unit of work with the
audit and the email after; a failed email gives `sent: false`; duplicate
email; filters and pagination; a responsable reaches only their
establishment and cannot change its type; suspension and reactivation rules
and audits; logo checks (PNG signature, SVG cleaning, size, type).

End-to-end: a super admin creates an establishment, the responsable accepts
the invitation, signs in on the back office (enrolment); a suspended
establishment's intervenant is refused on the next request; a mobile token
is refused everywhere (`CHANNEL_NOT_ALLOWED`).

## Out of scope

- Users and roles of the establishment (F3), recipients (F5), subscriptions
  follow-up and payments (F11, F17), statistics (F16).
- Deleting an establishment (termination, with ELV-06, comes with F17).
