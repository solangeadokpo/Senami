import { formatClock, formatDuration } from './use-countdown';

describe('countdown formats', () => {
  it('writes minutes and seconds in a sentence', () => {
    expect(formatDuration(245_000)).toBe('4 min 05 s');
  });

  it('writes a clock for the lock', () => {
    expect(formatClock(899_200)).toBe('15:00');
    expect(formatClock(61_000)).toBe('01:01');
  });
});
