import {
  DUPLICATE_EMAIL,
  NO_PRIMARY_RECIPIENT,
} from '@features/sheet-recipients/schemas/sheet-recipients.schema';

/** T-13: name what is concerned and the action to take again. */
const MESSAGES: Record<string, string> = {
  NO_PRIMARY_RECIPIENT,
  RECIPIENT_EMAIL_DUPLICATED: DUPLICATE_EMAIL,
  VALIDATION_FAILED: 'Vérifiez les adresses signalées puis réessayez.',
  ROLE_NOT_ALLOWED: 'Votre rôle ne permet pas cette modification.',
};

export function describeRecipientsError(code: string): string {
  return (
    MESSAGES[code] ??
    'Le service est momentanément indisponible. Réessayez dans un instant.'
  );
}
