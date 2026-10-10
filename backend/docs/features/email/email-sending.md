# Email sending (P4, minimal)

Requirements: MOB-01 (invitation link), INS-04 later, DEC-04 later (the sheet
email of F9 will reuse the port, not the templates).

## Purpose

Send the transactional emails of the platform, starting with the invitation
of a user. A local inbox (Mailpit) shows every email in development, so no
real address receives anything.

## Behaviour

- `EmailSender` (`src/shared/interfaces/email-sender.interface.ts`, token
  `EMAIL_SENDER`): `send({ to, subject, text, html })`. Rejects with
  `EmailProviderUnavailableError` (503 `EMAIL_PROVIDER_UNAVAILABLE`) when the
  provider refuses or cannot be reached.
- One adapter, SMTP (nodemailer): Mailpit locally, the chosen provider's SMTP
  relay elsewhere (provider still to choose). A fake for the tests keeps the
  sent emails in memory.
- Templates in code (`src/modules/email/templates/`), French, one function per
  email returning `{ subject, text, html }`. Charter N-05: text only, no
  remote image, no tracking pixel, no button; the HTML is the same text in
  Arial 11 pt, the link written out in full.
- First template, `invitation` (version validated with the mockup):

  ```
  Objet : Activez votre compte Sènami · École Saint-Denis

  Bonjour Claire,

  Vous êtes désormais responsable de l'établissement École Saint-Denis
  (Lille) sur Sènami, l'outil de déclaration des accidents bénins.

  Pour activer votre compte, créez votre mot de passe :
  https://app.senami.fr/invitation#<token>

  Ce lien est valable 72 heures, jusqu'au 10 octobre 2026 à 14 h 32.

  Vous n'attendiez pas ce message ? Ignorez-le : votre compte ne sera pas
  activé.

  L'équipe Sènami
  senami.app
  ```

  The role sentence follows the role ("intervenant de l'établissement" for
  an intervenant). The subject names the establishment, never a pupil.

- An email is sent after the transaction of the action commits: a rolled
  back action sends nothing. A failed send never undoes the action; the
  caller reports it (the invitation can be sent again).
- Logs: the template name and the outcome, never the address, the subject
  nor the body.

## Configuration

| Variable                     | Rule                                           |
| ---------------------------- | ---------------------------------------------- |
| `SMTP_HOST`, `SMTP_PORT`     | required; Mailpit: `localhost`, `1025`         |
| `SMTP_SECURE`                | `true` for implicit TLS (465), default `false` |
| `SMTP_USER`, `SMTP_PASSWORD` | optional, both or neither                      |
| `MAIL_FROM`                  | sender, e.g. `Sènami <no-reply@senami.app>`    |
| `WEB_APP_URL`                | back office URL, for the links in the emails   |

`docker-compose.yml` gains a `mailpit` service (SMTP 1025, web inbox on
http://localhost:8025), and the `api` service points to it.

## Tests

- Templates: the invitation names the establishment, the role and the
  expiry, carries the full link, has no `<img>` and no `<a` styled as a
  button.
- SMTP adapter: a refused send becomes `EmailProviderUnavailableError`.
- End-to-end: the creation of an establishment leaves one email in the fake
  sender, to the responsable, with a working link.

## Out of scope

- Editable email texts (SA-05), retries and an outbox: a failed invitation is
  resent by hand.
- The sheet email of F9 (other developer).
