# Invitation acceptance (screens)

API: [`backend/docs/features/users/invitation-acceptance.md`](../../../../backend/docs/features/users/invitation-acceptance.md).
Layout B of the sign-in (card on the indigo backdrop).

## `app.senami.fr/invitation#<token>`

Public, reachable without session (the proxy lets `/invitation` through).
The token is read from the fragment by the page and sent in request bodies
only (Server Actions); it is removed from the address bar once read. A link
opened again in the same tab changes the fragment only: the page reads it
too. A malformed token is refused before any call.

- Loading: a skeleton card while the invitation is looked up.
- Valid: "Bienvenue, Léa", the establishment and its city, the role, the
  email, the expiry (France's time); a password with its confirmation,
  show/hide, the rules shown as a checklist that ticks while typing (12
  characters at least, the same twice), "Créer mon mot de passe" enabled
  once both are met.
- Done, responsable: "Compte activé", "Votre mot de passe est créé", then
  "Se connecter", which leads to the activation of the second factor.
- Done, intervenant: the same title, then "Ouvrez l'application Sènami sur
  votre téléphone et connectez-vous avec <email> et ce mot de passe".
- Expired or replaced (`INVITATION_EXPIRED`): "Lien expiré", "Ce lien n'est
  plus valable", valid 72 hours and replaced by a newer one; ask the person
  who invited you (the Sènami team or the responsable).
- Invalid or already used (`INVITATION_INVALID`, no token): "Ce lien ne
  permet pas d'activer un compte", with "Se connecter" for those whose
  account is already active.
- Any other failure while accepting: an alert above the form, the typed
  password kept.

## Tests

- Unit: the password rules.
- End-to-end (Playwright, without the API): the page is public; a link
  without token or with a malformed one shows the invalid state; the token
  leaves the address bar, also when the link is opened again in the tab.
- With the API, checked by hand: accept an invitation, then sign in; the
  old link after a resend shows the expired state; neither the token nor
  the password appears in the API or web logs.
