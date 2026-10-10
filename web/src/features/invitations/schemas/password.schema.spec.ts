import { passwordRules } from './password.schema';

describe('passwordRules', () => {
  it('needs twelve characters and the same confirmation', () => {
    expect(passwordRules('court', 'court')).toEqual({
      isLongEnough: false,
      isConfirmed: true,
    });
    expect(passwordRules('un mot de passe', 'un mot de pass')).toEqual({
      isLongEnough: true,
      isConfirmed: false,
    });
    expect(passwordRules('un mot de passe', 'un mot de passe')).toEqual({
      isLongEnough: true,
      isConfirmed: true,
    });
  });

  it('does not confirm an empty confirmation', () => {
    expect(passwordRules('', '').isConfirmed).toBe(false);
  });
});
