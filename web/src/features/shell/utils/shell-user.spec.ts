import { UserRole } from '@shared/enums/user-role.enum';
import { initialsOf, roleLabel, toUserRole } from './shell-user';
import { navItemsFor } from './nav-items';

describe('shell user', () => {
  it('reads a role from the API', () => {
    expect(toUserRole(UserRole.SUPER_ADMIN)).toBe(UserRole.SUPER_ADMIN);
    expect(() => toUserRole('unknown')).toThrow();
  });

  it('labels the role and gives the initials', () => {
    expect(roleLabel(UserRole.RESPONSABLE)).toBe('Responsable d’établissement');
    expect(initialsOf({ firstName: 'élise', lastName: 'Martin' })).toBe('ÉM');
  });

  it('gives each role its own menu, the dashboard first', () => {
    expect(
      navItemsFor(UserRole.SUPER_ADMIN).map((item) => item.label),
    ).toContain('Établissements');
    expect(navItemsFor(UserRole.RESPONSABLE)[0]).toMatchObject({
      href: '/',
      isAvailable: true,
    });
  });
});
