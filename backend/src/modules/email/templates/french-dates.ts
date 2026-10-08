const TIME_ZONE = 'Europe/Paris';
const NBSP = '\u00a0';

/** "10 octobre 2026", in France's time. */
export function frenchDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "14 h 32", as the charter writes an hour in a sentence. */
export function frenchTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: TIME_ZONE,
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('hour')}${NBSP}h${NBSP}${part('minute')}`;
}
