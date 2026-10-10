'use server';

import { type ActionResult, toActionFailure } from '@core/api/action-result';
import { setFlash } from '@core/flash/set-flash';
import {
  createEstablishment,
  reactivateEstablishment,
  removeLogo,
  resendInvitation,
  resetSecondFactor,
  suspendEstablishment,
  updateEstablishment,
  uploadLogo,
} from '@features/establishments/api/establishments.api';
import {
  type EstablishmentValues,
  type IdentityValues,
  type ResponsableValues,
  establishmentSchema,
  identitySchema,
  responsableSchema,
  toApiFields,
} from '@features/establishments/schemas/establishment.schema';

const VALIDATION = { ok: false, code: 'VALIDATION_FAILED' } as const;

/** SA-02. The page then opens the new establishment. */
export async function createEstablishmentAction(values: {
  establishment: EstablishmentValues;
  responsable: ResponsableValues;
}): Promise<ActionResult<{ establishmentId: string }>> {
  const establishment = establishmentSchema.safeParse(values.establishment);
  const responsable = responsableSchema.safeParse(values.responsable);
  if (!establishment.success || !responsable.success) return VALIDATION;

  try {
    const created = await createEstablishment({
      establishment: toApiFields(establishment.data),
      responsable: responsable.data,
    });
    await setFlash({
      kind: 'message',
      text: created.invitation.sent
        ? 'Établissement créé. Invitation envoyée au responsable.'
        : 'Établissement créé. L’invitation n’a pas pu partir : renvoyez-la depuis cette page.',
    });
    return { ok: true, establishmentId: created.establishment.id };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function updateEstablishmentAction(
  establishmentId: string,
  values: EstablishmentValues,
): Promise<ActionResult<object>> {
  const parsed = establishmentSchema.safeParse(values);
  if (!parsed.success) return VALIDATION;
  try {
    await updateEstablishment(establishmentId, toApiFields(parsed.data));
    await setFlash({ kind: 'message', text: 'Établissement mis à jour.' });
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}

/** The responsable's identity form: fields, then the logo if it changed. */
export async function updateIdentityAction(
  establishmentId: string,
  values: IdentityValues,
  logo: FormData | null,
  isLogoRemoved: boolean,
): Promise<ActionResult<object>> {
  const parsed = identitySchema.safeParse(values);
  if (!parsed.success) return VALIDATION;
  try {
    await updateEstablishment(establishmentId, toApiFields(parsed.data));
    const file = logo?.get('logo');
    if (file instanceof File) await uploadLogo(establishmentId, file);
    else if (isLogoRemoved) await removeLogo(establishmentId);
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function suspendEstablishmentAction(
  establishmentId: string,
  reason: string,
): Promise<ActionResult<object>> {
  if (reason.trim().length < 3) return VALIDATION;
  try {
    await suspendEstablishment(establishmentId, reason.trim());
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function reactivateEstablishmentAction(
  establishmentId: string,
): Promise<ActionResult<object>> {
  try {
    await reactivateEstablishment(establishmentId);
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function resendInvitationAction(
  userId: string,
): Promise<ActionResult<{ expiresAt: string }>> {
  try {
    const { expiresAt } = await resendInvitation(userId);
    return { ok: true, expiresAt };
  } catch (error) {
    return toActionFailure(error);
  }
}

export async function resetSecondFactorAction(
  userId: string,
): Promise<ActionResult<object>> {
  try {
    await resetSecondFactor(userId);
    return { ok: true };
  } catch (error) {
    return toActionFailure(error);
  }
}
