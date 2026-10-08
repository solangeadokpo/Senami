import { z } from 'zod';
import { EstablishmentType } from '@shared/enums/establishment-type.enum';

const required = (message: string) => z.string().trim().min(1, message);
const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === '' || z.email().safeParse(value).success, {
    message:
      'Saisissez une adresse e-mail valide, par exemple contact@ecole.fr.',
  });

// The client checks for comfort, the API decides (conventions, Forms).
export const establishmentSchema = z.object({
  name: required('Saisissez le nom de l’établissement.').max(200),
  type: z.enum(EstablishmentType, {
    message: 'Choisissez le type d’établissement.',
  }),
  addressLine: required('Saisissez l’adresse.').max(200),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Saisissez un code postal à cinq chiffres.'),
  city: required('Saisissez la ville.').max(100),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[0-9 +().-]{6,30}$/.test(value), {
      message: 'Saisissez un numéro de téléphone, par exemple 03 20 00 00 00.',
    }),
  email: optionalEmail,
});

export const responsableSchema = z.object({
  firstName: required('Saisissez le prénom.').max(100),
  lastName: required('Saisissez le nom.').max(100),
  email: z
    .string()
    .trim()
    .min(1, 'Saisissez l’e-mail du responsable.')
    .pipe(
      z.email(
        'Saisissez une adresse e-mail valide, par exemple direction@ecole.fr.',
      ),
    ),
});

export type EstablishmentValues = z.infer<typeof establishmentSchema>;
export type ResponsableValues = z.infer<typeof responsableSchema>;

/** The identity printed on the sheet, as the responsable edits it. */
export const identitySchema = establishmentSchema.omit({ type: true });
export type IdentityValues = z.infer<typeof identitySchema>;

/** Empty optional fields go to the API as null. */
export function toApiFields<T extends { phone: string; email: string }>(
  values: T,
): Omit<T, 'phone' | 'email'> & { phone: string | null; email: string | null } {
  return {
    ...values,
    phone: values.phone === '' ? null : values.phone,
    email: values.email === '' ? null : values.email,
  };
}
