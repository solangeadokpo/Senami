import { formatDate, formatDateTime } from './format-date';
import { NBSP } from './format-time';

describe('formatDate', () => {
  it('writes the month in full', () => {
    expect(formatDate(new Date('2026-10-07T10:00:00Z'))).toBe('7 octobre 2026');
  });

  it('takes the day in France’s time', () => {
    expect(formatDate(new Date('2026-10-06T22:30:00Z'))).toBe('7 octobre 2026');
  });

  it('adds the hour as the charter writes it', () => {
    expect(formatDateTime(new Date('2026-10-10T12:32:00Z'))).toBe(
      `10 octobre 2026 à 14${NBSP}h${NBSP}32`,
    );
  });
});
