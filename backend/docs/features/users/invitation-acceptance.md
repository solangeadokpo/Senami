# Invitation acceptance (F3, part)

Requirements: MOB-01 (first sign-in after the invitation, link valid 72 h),
§9.1 (the responsable activates their account).

## Purpose

Let an invited user create their password from the link of the invitation
email, so that they can sign in: on the back office (responsable, then the
second factor) or on the mobile app (intervenant).

## Behaviour

- The link is `WEB_APP_URL/invitation#<token>`. The token is in the fragment:
  browsers never send it, so no server or proxy log holds it. The web page
  reads it and sends it in request bodies only.
- Token: 32 random bytes (base64url), stored as its SHA-256 (`token_hash`);
  valid 72 h; one pending invitation per user (a resend revokes the previous
  one).
- `POST /invitations/lookup` `{ token }`, public: `{ firstName, email,
role, establishmentName, establishmentCity, expiresAt }` of a pending
  invitation.
- `POST /invitations/acceptance` `{ token, password }`, public: sets the
  password (argon2id), the user becomes `active`, the invitation
  `accepted_at`. 204. The user then signs in as usual.
- Password rule: 12 to 128 characters (as the seeds); the API answers 422
  with the field error otherwise.
- Errors: unknown token or already used, `INVITATION_INVALID` (404);
  expired or replaced by a newer one, `INVITATION_EXPIRED` (422, a business
  rule: the error families have no 410), with the advice to ask for
  a new one; the same answer whatever the cause inside each group.
- Throttled per IP like the sign-in (10 per minute).
- Audit: `invitation_accepted`, actor the user.

## Resend

`POST /users/:userId/invitation`, `@Channels(BACKOFFICE)`, super admin for
anyone, responsable for the users of their establishment: revokes the
pending invitation, creates a new one (72 h), sends the email. 404 for an
unreachable user, 409 `USER_ALREADY_ACTIVE` once accepted. Audit
`invitation_sent`.

## Tests

- Lookup and acceptance of a pending invitation; the user can sign in.
- An expired, revoked or used token is refused with its code; a short
  password with 422.
- A resend invalidates the previous link.
- No token appears in the logs (lookup, acceptance, resend).

## Out of scope

- Inviting users from the back office (F3: users and roles).
- Editable validity (SA-05: 72 h fixed).
