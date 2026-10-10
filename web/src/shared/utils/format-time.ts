/** A non-breaking space, written as an escape so it stays visible. */
export const NBSP = '\u00a0';

/** French hour as the charter writes it in a sentence: 14 h 32. */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}${NBSP}h${NBSP}${minutes}`;
}
