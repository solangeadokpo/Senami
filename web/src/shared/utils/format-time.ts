/** A non-breaking space, written as an escape so it stays visible. */
export const NBSP = ' ';

/** Every date is shown in France's time, whatever the device (RG-05). */
export const TIME_ZONE = 'Europe/Paris';

const TIME = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

/** French hour as the charter writes it in a sentence: 14 h 32. */
export function formatTime(date: Date): string {
  const parts = TIME.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('hour')}${NBSP}h${NBSP}${part('minute')}`;
}
