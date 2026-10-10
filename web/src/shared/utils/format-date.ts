import { TIME_ZONE, formatTime } from '@shared/utils/format-time';

const DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

/** "7 octobre 2026", in France's time (RG-05). */
export function formatDate(date: Date): string {
  return DATE.format(date);
}

/** "10 octobre 2026 à 14 h 32". */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} à ${formatTime(date)}`;
}
