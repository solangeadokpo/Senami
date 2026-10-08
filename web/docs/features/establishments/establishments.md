# Establishments (screens, F4)

API: [`backend/docs/features/establishments/establishments.md`](../../../../backend/docs/features/establishments/establishments.md).
Design: the back office shell, the components of the sign-in, and the
mockup validated before this code.

## Super administrator

### `/etablissements`: the list

- Title, "Nouvel établissement" (the action of the screen).
- Search (name or responsable email, applied while typing after 300 ms),
  city filter, status filter (Actif, Suspendu, Résilié), shown as removable
  chips; the URL keeps them (`?q=&ville=&statut=&page=`), so a refresh or a
  shared link shows the same list.
- Table: establishment (name, city, type), responsable (name, email,
  "Invitation envoyée" or "Actif"), declarations this month, subscription
  (status, due date), status. A row opens the detail; hover and focus show it
  is a link.
- Pagination: 20 per page, "Précédent", "Suivant", "21 à 40 sur 57".
- States: loading (skeleton rows), empty (no establishment yet: invite to
  create the first), no result for the filters (offer to clear them), error.
- Under 1024 px, rows become cards.

### `/etablissements/nouveau`: the creation, a three-step wizard

- A progress bar: Établissement, Responsable, Vérification; the current
  step in coral. One step at a time, sliding in.
- Step 1, Établissement: name, type as single-choice chips, address line,
  postal code, city, phone, email.
- Step 2, Responsable: first name, last name, email (receives the
  invitation, valid 72 hours).
- "Continuer" checks the fields of the current step only; "Retour" goes back
  without losing what was typed; "Annuler" on the first step leaves.
- Step 3, Vérification: the two blocks summarised, each with "Modifier",
  which goes back to its step with its values; "Créer et inviter le
  responsable" (pending state).
- Field errors under each field (client, then API); a 409 on the email is
  shown on the summary, with the way to change it.
- On success: the detail page with a toast, "Établissement créé.
  Invitation envoyée au responsable." (no address: the flash cookie holds
  no personal data, the page shows it) or, when the email failed, "L'invitation
  n'a pas pu partir : renvoyez-la depuis cette page.".

### `/etablissements/[id]`: the detail

- Header: name, status badge, city and type; actions "Modifier" and
  "Suspendre" (or "Réactiver").
- Cards: identity (logo or its placeholder, address, phone, email, pupils),
  responsable (name, email, state; invited: expiry and "Renvoyer
  l'invitation"; active: second factor state and "Réinitialiser la double
  authentification"), subscription (plan, status, due date), activity
  (declarations this month, users by role).
- Suspension: a dialog (I-06, confirmation) with a mandatory reason, then
  "Suspendre l'établissement" (destructive). Reactivation: a dialog,
  "Réactiver l'établissement".
- Second factor reset: a dialog explaining the consequence (next sign-in
  goes through the activation again, back office sessions closed).
- "Modifier": the same fields as the creation for the establishment, in a
  page `/etablissements/[id]/modifier`.

## Responsable

### `/fiche`: the identity printed on the sheet

The menu entry "Fiche et destinataires" opens. This feature fills its
first part; the recipients come with F5.

- Name printed, address, phone, email: a form, "Enregistrer les
  modifications" disabled until something changed, a toast once done.
- Logo: drop zone or "Choisir un fichier", PNG or SVG, 512 KB at most,
  preview, "Remplacer", "Retirer" (with confirmation). Errors named: type,
  size, unreadable SVG.
- A preview of the sheet header (logo, name, address) as it will be
  printed, updated while typing.

## Errors handled

| Code                                                             | Shown                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------ |
| `USER_EMAIL_ALREADY_USED`                                        | an alert on the summary, "Modifier" leads to the email |
| `VALIDATION_FAILED`                                              | under each field                                       |
| `PAYLOAD_TOO_LARGE`, `LOGO_TYPE_NOT_ALLOWED`, `LOGO_INVALID`     | under the logo                                         |
| `ESTABLISHMENT_ALREADY_SUSPENDED`, `ESTABLISHMENT_NOT_SUSPENDED` | the page reloads with the current state                |
| `NO_CURRENT_PLAN_PRICE`, anything else                           | an alert at the top of the form                        |

## Access and display

- The pages of the other role answer 404 (`requireRole`): their existence
  is not disclosed. A responsable reaches only their own establishment.
- Dates and hours are shown in France's time (RG-05), whatever the device.
- One toast at a time: a page toast hides the flash still showing.

## Tests

- Unit: list filters to and from the URL, postal code and phone formats,
  logo checks before upload, form schemas, menu entries and their active
  state, toasts.
- End-to-end (Playwright, without the API): the establishment pages stay
  behind the sign-in.
- With the API, checked by hand: a super admin creates an establishment
  (duplicate email refused), finds it in the list and with the filters,
  edits it, resends the invitation, suspends it (the responsable is signed
  out and refused) and reactivates it; a responsable adds a logo and
  changes the phone; at 390 px no page scrolls sideways.
