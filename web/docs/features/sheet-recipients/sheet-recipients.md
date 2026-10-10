# Sheet recipients (screen, F5)

API: [`backend/docs/features/sheet-recipients/sheet-recipients.md`](../../../../backend/docs/features/sheet-recipients/sheet-recipients.md).
Design: the "Destinataires des fiches" card of `/fiche`, today a placeholder
("Arrive avec la gestion des destinataires"), in the mockup validated before
the establishment screens.

## `/fiche`: the "Destinataires des fiches" card

The responsable's page `/fiche` keeps the identity form of F4; the card
under it becomes its own form, saved apart from the identity (its own
request, its own button).

- Hint under the title: "Les fiches sont transmises par e-mail à ces
  adresses."
- Three fields of chips, each with its `Label`:
  - "Destinataires principaux" (`to`), hint "Au moins une adresse.";
  - "Copie" (`cc`);
  - "Copie cachée" (`bcc`), hint "Ces adresses ne sont pas visibles des
    autres destinataires.".
- A chip shows the email and a cross button, `aria-label` "Retirer
  <email>", 44 px touch target. The cross of the last main recipient is
  disabled, with the hint "Au moins un destinataire principal est requis."
- Adding: an input at the end of the chips. Enter, comma, semicolon or
  leaving the field turns what was typed into a chip; pasting a list
  (separated by commas, semicolons, spaces or new lines) adds every
  address. Backspace in an empty input selects the last chip, a second
  Backspace removes it.
- An address is trimmed and checked before becoming a chip: an invalid one
  stays in the input with "Adresse e-mail invalide."; one already present
  in any of the three lists, case ignored, stays with "Cette adresse figure
  déjà parmi les destinataires."
- "Enregistrer les destinataires" (default button) and "Annuler les
  modifications" (ghost, as on the identity form): disabled until something changed; pending state
  while saving. Then a toast: "Destinataires mis à jour."
- Under 640 px the chips wrap; nothing scrolls sideways.

## Errors handled

| Code                         | Shown                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `RECIPIENT_EMAIL_DUPLICATED` | the chip at `details.list` and `details.index` in error, with the duplicate message |
| `NO_PRIMARY_RECIPIENT`       | under "Destinataires principaux"                                                    |
| `VALIDATION_FAILED`          | under the field named in `fields`                                                   |
| anything else                | an alert at the top of the card                                                     |

The client checks for comfort only: the API errors are always shown, even
when the client schema passed.

## Data

- The page reads the lists in its Server Component (`getSheetRecipients()`,
  through `serverApi`) alongside the establishment detail, and passes plain
  arrays to the client form.
- `updateSheetRecipientsAction(values)` calls `PUT /sheet-recipients`,
  returns an `ActionResult`; the form then refreshes the page
  (`router.refresh()`, as the identity form does).
- `ActionResult` failures carry the API `details`, so that a duplicate
  points at its chip (`@core/api/action-result`).
- Types from `pnpm api:types`: `ApiSchemas['SheetRecipientsResponseDto']`,
  `ApiSchemas['UpdateSheetRecipientsDto']`.

## New files

| File                                                                              | Purpose                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------- |
| `src/features/sheet-recipients/api/sheet-recipients.api.ts`                       | `getSheetRecipients()`                            |
| `src/features/sheet-recipients/actions/sheet-recipients.actions.ts`               | `updateSheetRecipientsAction()`                   |
| `src/features/sheet-recipients/schemas/sheet-recipients.schema.ts` (+ `.spec.ts`) | the three lists, `to` not empty, no duplicate     |
| `src/features/sheet-recipients/components/recipients-form.tsx`                    | the card and its three fields                     |
| `src/features/sheet-recipients/components/email-chips-field.tsx` (+ `.spec.tsx`)  | label, chips, cross, input, paste, help line      |
| `src/features/sheet-recipients/utils/email-list.ts` (+ `.spec.ts`)                | splitting a pasted list, comparison ignoring case |
| `src/features/sheet-recipients/utils/error-messages.ts`                           | the messages of the codes                         |
| `src/shared/enums/recipient-list.enum.ts`                                         | mirrors the backend `RecipientList`               |

## Affected areas

- `src/app/admin/(authenticated)/fiche/page.tsx`: reads the recipients and
  renders the form under the identity.
- `src/features/establishments/components/identity-form.tsx`: the
  placeholder card goes; its `children` are rendered under the form.
- `src/core/api/action-result.ts`: `details` on failures.
- `src/core/api/schema.d.ts`: regenerated.

## Tests

- Unit: splitting a pasted list (commas, semicolons, spaces, new lines,
  empty parts); duplicates across the three lists ignoring case; the schema
  refuses an empty `to` and an invalid email; the chips input adds on Enter,
  comma and blur, removes with the cross and with Backspace, keeps an
  invalid address in the input with its message, disables the cross of the
  last main recipient.
- Checked on the running app: `/fiche` renders the demo responsable as
  the main recipient, its cross disabled.
- With the API, to check by hand in a browser: the responsable of a new establishment
  finds their email as main recipient; adds two copies and a blind copy,
  saves, reloads and finds them; cannot remove the last main recipient; a
  duplicate is refused before saving; at 390 px the card does not scroll
  sideways.

## Out of scope

- The preview of the whole sheet (waits for the PDF of F9).
- The recipients on the super admin's establishment detail.
