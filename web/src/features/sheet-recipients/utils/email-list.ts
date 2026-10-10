import { z } from 'zod';

/** A pasted list: commas, semicolons, spaces or new lines between addresses. */
export function splitEmails(text: string): string[] {
  return text.split(/[\s,;]+/).filter((part) => part !== '');
}

export function isEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

/** Emails are compared regardless of case, as the API does. */
export function hasEmail(emails: readonly string[], email: string): boolean {
  const key = email.toLowerCase();
  return emails.some((candidate) => candidate.toLowerCase() === key);
}
