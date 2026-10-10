import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH)
  .max(MAX_PASSWORD_LENGTH);

/** The rules shown as a checklist that ticks while typing. */
export function passwordRules(password: string, confirmation: string) {
  return {
    isLongEnough:
      password.length >= MIN_PASSWORD_LENGTH &&
      password.length <= MAX_PASSWORD_LENGTH,
    isConfirmed: confirmation.length > 0 && password === confirmation,
  };
}
