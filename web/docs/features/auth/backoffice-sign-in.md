# Back office sign-in (screens)

Requirements: 2FA-01 to 2FA-05, ETB-09, SA-06. API:
[`backend/docs/features/auth/backoffice-authentication.md`](../../../../backend/docs/features/auth/backoffice-authentication.md).
Design: layout B of the validated mockup (floating card on the animated
indigo backdrop), back office shell of the maquette, with the coral touches
of [`conventions.md`](../../conventions.md#colours).

## Purpose

Let a responsable or the super administrator open a back office session:
password, then the second factor, enrolled at the first sign-in. Then show
the back office shell, whose pages arrive with the next features.

## Screens and states

All on `app.senami.fr/connexion`, one card, the steps replacing each other
without a page load. The challenge token stays in memory: a reload starts
over.

| Step           | Shows                                                                                            | Leaves to                                                       |
| -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Sign-in        | email, password (show/hide, caps lock warning), "Se connecter"                                   | enrolment or verification; locked                               |
| Enrolment      | progress (Scanner, Confirmer, Codes de secours), QR code, key with "Copier la clé", 6-digit code | recovery codes                                                  |
| Recovery codes | the 10 codes once, "Copier les codes", "J'ai conservé…" checkbox, "Accéder au back-office"       | the dashboard (full load)                                       |
| Verification   | 6-digit code, "Utiliser un code de secours"                                                      | the dashboard (full load); recovery code                        |
| Recovery code  | code formatted `XXXXX-XXXXX` while typed, help when none is left                                 | the dashboard, with the number of codes left                    |
| Locked         | the end of the lock, live countdown, "Ce n'est pas vous ?"                                       | sign-in, when the countdown ends or on "Revenir à la connexion" |
| Expired        | the 5 minutes are over                                                                           | sign-in                                                         |

The enrolment, verification and recovery steps show the time left of the
challenge ("Étape valable encore 4 min 58 s", in warning colour under a
minute) and move to "Expired" when it runs out.

A code refused by the API shakes the boxes, clears them and says why; the
fifth refusal shows "Locked". After a sign-in or a sign-out, a toast says
what happened: "Connexion établie. Session ouverte jusqu'à 02 h 32.",
"Connexion avec un code de secours. Il vous en reste 9.", "Vous êtes
déconnecté."

### Back office shell

`app/admin/(authenticated)/`: every page needs a back office session
(`/auth/me`), or goes to `/connexion`.

- Sidebar (drawer under 1024 px): kit logo (inverse), the space, the
  establishment of a responsable, the menu of the role, the note on sheets,
  the user (initials, name, role) with "Se déconnecter".
- Menu entries whose page does not exist yet are greyed out, not links.
- Dashboard: placeholder tiles of the role and "Les indicateurs arrivent avec
  les prochaines fonctionnalités".

## API calls and errors

| Server Action              | API                                                                      | On success                                            |
| -------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| `signInAction`             | `POST /auth/backoffice/login`, then `/totp/enrolment` on a first sign-in | the step, the challenge, the QR code                  |
| `confirmEnrolmentAction`   | `POST /auth/backoffice/totp/enrolment/confirm`                           | session held pending, recovery codes                  |
| `finishEnrolmentAction`    | none                                                                     | the pending session becomes the session               |
| `verifyCodeAction`         | `POST /auth/backoffice/totp/verify`                                      | session cookie                                        |
| `redeemRecoveryCodeAction` | `POST /auth/backoffice/totp/recovery`                                    | session cookie, codes left                            |
| `signOutAction`            | `POST /auth/logout`                                                      | cookie removed, even if the session had already ended |

The session cookie returned by the API to the Next.js server is set again on
the back office host: `HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS, with
the API's expiry.

| Code                                                                                            | Shown                                                      |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `INVALID_CREDENTIALS`                                                                           | "Adresse e-mail ou mot de passe incorrect"                 |
| `ACCOUNT_NOT_ACTIVATED`, `ACCOUNT_DEACTIVATED`                                                  | what to do: invitation link, or the responsable            |
| `CHANNEL_NOT_ALLOWED`                                                                           | "Ce compte se connecte depuis l'application mobile"        |
| `ESTABLISHMENT_SUSPENDED`                                                                       | "L'accès de votre établissement est suspendu"              |
| `RATE_LIMITED`                                                                                  | "Trop de tentatives en une minute"                         |
| `INVALID_TOTP_CODE`                                                                             | under the code: wrong code, or wrong or used recovery code |
| `TOTP_LOCKED`                                                                                   | the "Locked" step, until `details.lockedUntil`             |
| `INVALID_CHALLENGE`, `TOTP_ALREADY_ENROLLED`, `TOTP_NOT_ENROLLED`, `TOTP_ENROLMENT_NOT_STARTED` | the "Expired" step                                         |
| anything else, API unreachable                                                                  | "Le service est momentanément indisponible"                |

## Tests

- Unit: error messages, recovery code format, Set-Cookie parsing, flash
  messages, sign-in schema, countdown formats, OTP and password inputs,
  shell user and menus, the proxy rule without session cookie.
- End-to-end (Playwright, without the API): a visitor without session goes to
  `/connexion`; the form asks for both fields and checks the email; the
  password shows and hides.
- The journey against the API (first sign-in with enrolment, wrong code,
  recovery codes, dashboard, sign-out, sign-in with a recovery code) was run
  by hand with a scripted browser on the local stack. Automating it needs the
  API and a test database started with Playwright: a later step.

## Out of scope

- Forgotten password (needs the emails, P4).
- The "Mes sessions" page (the API exists: `GET /auth/sessions`).
- The pages behind the greyed menu entries.
