import { hasEmail, isEmail, splitEmails } from './email-list';

describe('splitEmails', () => {
  it('splits on commas, semicolons, spaces and new lines', () => {
    expect(
      splitEmails('a@ecole.fr, b@ecole.fr;c@ecole.fr d@ecole.fr\ne@ecole.fr'),
    ).toEqual([
      'a@ecole.fr',
      'b@ecole.fr',
      'c@ecole.fr',
      'd@ecole.fr',
      'e@ecole.fr',
    ]);
  });

  it('drops the empty parts', () => {
    expect(splitEmails(' ,; a@ecole.fr ,, ')).toEqual(['a@ecole.fr']);
    expect(splitEmails('   ')).toEqual([]);
  });
});

describe('isEmail', () => {
  it('accepts an address and refuses anything else', () => {
    expect(isEmail('direction@ecole.fr')).toBe(true);
    expect(isEmail('direction')).toBe(false);
    expect(isEmail('direction@')).toBe(false);
  });
});

describe('hasEmail', () => {
  it('compares regardless of case', () => {
    expect(hasEmail(['Direction@Ecole.fr'], 'direction@ecole.fr')).toBe(true);
    expect(hasEmail(['direction@ecole.fr'], 'infirmerie@ecole.fr')).toBe(false);
  });
});
