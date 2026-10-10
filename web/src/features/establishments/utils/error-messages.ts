/** T-13: name what is concerned and the action to take again. */
const MESSAGES: Record<string, string> = {
  USER_EMAIL_ALREADY_USED:
    'Cette adresse est déjà utilisée par un compte Sènami. Saisissez une autre adresse.',
  ESTABLISHMENT_NOT_FOUND:
    'Cet établissement n’existe plus. Revenez à la liste.',
  ESTABLISHMENT_ALREADY_SUSPENDED:
    'L’établissement est déjà suspendu. Rechargez la page.',
  ESTABLISHMENT_NOT_SUSPENDED:
    'L’établissement n’est pas suspendu. Rechargez la page.',
  NO_CURRENT_PLAN_PRICE:
    'Aucun tarif d’abonnement n’est en vigueur. Configurez un prix avant de créer un établissement.',
  LOGO_TYPE_NOT_ALLOWED: 'Choisissez une image PNG ou SVG.',
  LOGO_INVALID: 'Cette image n’a pas pu être lue. Choisissez un autre fichier.',
  PAYLOAD_TOO_LARGE: 'Choisissez une image de 512 Ko au plus.',
  USER_ALREADY_ACTIVE:
    'Ce compte est déjà activé : l’invitation n’est plus nécessaire.',
  EMAIL_PROVIDER_UNAVAILABLE:
    'L’e-mail n’a pas pu partir. Réessayez dans un instant.',
  VALIDATION_FAILED: 'Vérifiez les champs signalés puis réessayez.',
  ROLE_NOT_ALLOWED: 'Votre rôle ne permet pas cette modification.',
};

export function describeEstablishmentError(code: string): string {
  return (
    MESSAGES[code] ??
    'Le service est momentanément indisponible. Réessayez dans un instant.'
  );
}
