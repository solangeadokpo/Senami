import { NBSP, formatTime } from './format-time';

describe('formatTime', () => {
  it('writes the hour with non-breaking spaces', () => {
    expect(formatTime(new Date('2026-10-07T07:05:00Z'))).toBe(
      `09${NBSP}h${NBSP}05`,
    );
  });

  it('shows France’s time, whatever the device', () => {
    // Winter time: UTC+1.
    expect(formatTime(new Date('2026-12-01T23:30:00Z'))).toBe(
      `00${NBSP}h${NBSP}30`,
    );
  });
});
