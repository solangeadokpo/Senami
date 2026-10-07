import { z } from 'zod';

// The client checks for comfort, the API decides (conventions, Forms).
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Saisissez votre adresse e-mail.')
    .pipe(
      z.email('Saisissez une adresse e-mail valide, par exemple nom@ecole.fr.'),
    ),
  password: z
    .string()
    .min(1, 'Saisissez votre mot de passe.')
    .max(128, 'Le mot de passe dépasse 128 caractères.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const totpCodeSchema = z.string().regex(/^\d{6}$/);

export const recoveryCodeSchema = z.string().regex(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);

export const challengeTokenSchema = z.string().min(1).max(2048);
