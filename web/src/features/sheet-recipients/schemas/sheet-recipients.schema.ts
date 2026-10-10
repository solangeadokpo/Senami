import { z } from 'zod';
import { RecipientList } from '@shared/enums/recipient-list.enum';

export const INVALID_EMAIL = 'Adresse e-mail invalide.';
export const DUPLICATE_EMAIL =
  'Cette adresse figure déjà parmi les destinataires.';
export const NO_PRIMARY_RECIPIENT =
  'Au moins un destinataire principal est requis.';

const emails = z.array(z.email(INVALID_EMAIL));

// The client checks for comfort, the API decides (conventions, Forms).
export const recipientsSchema = z
  .object({
    to: emails.min(1, NO_PRIMARY_RECIPIENT),
    cc: emails,
    bcc: emails,
  })
  .superRefine((lists, context) => {
    const seen = new Set<string>();
    for (const list of Object.values(RecipientList)) {
      lists[list].forEach((email, index) => {
        const key = email.toLowerCase();
        if (seen.has(key)) {
          context.addIssue({
            code: 'custom',
            path: [list, index],
            message: DUPLICATE_EMAIL,
          });
        }
        seen.add(key);
      });
    }
  });

export type RecipientsValues = z.infer<typeof recipientsSchema>;
