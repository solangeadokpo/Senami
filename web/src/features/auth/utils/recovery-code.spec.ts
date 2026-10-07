import { formatRecoveryCode, isCompleteRecoveryCode } from './recovery-code';

describe('formatRecoveryCode', () => {
  it('groups by five in capitals', () => {
    expect(formatRecoveryCode('k7q2m9xwpa')).toBe('K7Q2M-9XWPA');
  });

  it('ignores spaces and other separators, and extra characters', () => {
    expect(formatRecoveryCode(' k7q2m 9xwpa-zz')).toBe('K7Q2M-9XWPA');
  });

  it('adds the dash only once past five characters', () => {
    expect(formatRecoveryCode('k7q2')).toBe('K7Q2');
    expect(formatRecoveryCode('k7q2m9')).toBe('K7Q2M-9');
  });
});

describe('isCompleteRecoveryCode', () => {
  it('needs ten characters', () => {
    expect(isCompleteRecoveryCode('K7Q2M-9XWPA')).toBe(true);
    expect(isCompleteRecoveryCode('K7Q2M-9XWP')).toBe(false);
  });
});
