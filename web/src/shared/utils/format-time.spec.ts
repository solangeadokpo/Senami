import { formatTime } from './format-time';

describe('formatTime', () => {
  it('writes the hour with non-breaking spaces', () => {
    expect(formatTime(new Date(2026, 9, 7, 9, 5))).toBe('09 h 05');
  });
});
