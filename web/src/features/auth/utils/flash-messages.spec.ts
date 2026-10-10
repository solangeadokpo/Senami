import { describeAuthFlash } from './flash-messages';

describe('describeAuthFlash', () => {
  it('gives the end of the session in local time', () => {
    const until = new Date(2026, 9, 7, 2, 32).toISOString();

    expect(
      describeAuthFlash({ kind: 'signed-in', sessionExpiresAt: until }),
    ).toBe('Connexion établie. Session ouverte jusqu’à 02 h 32.');
  });

  it('counts the recovery codes left, and warns on the last one', () => {
    expect(
      describeAuthFlash({ kind: 'recovery-code-used', remaining: 9 }),
    ).toBe('Connexion avec un code de secours. Il vous en reste 9.');
    expect(
      describeAuthFlash({ kind: 'recovery-code-used', remaining: 0 }),
    ).toContain('dernier code de secours');
  });

  it('ignores anything else', () => {
    expect(describeAuthFlash({ kind: 'other' })).toBeNull();
    expect(describeAuthFlash('signed-out')).toBeNull();
  });
});
