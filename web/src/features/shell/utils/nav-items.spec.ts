import { isActiveItem, navItemsFor } from './nav-items';
import { UserRole } from '@shared/enums/user-role.enum';

describe('isActiveItem', () => {
  it('keeps the dashboard active on its own page only', () => {
    expect(isActiveItem('/', '/')).toBe(true);
    expect(isActiveItem('/', '/etablissements')).toBe(false);
  });

  it('keeps a section active on its sub-pages', () => {
    expect(isActiveItem('/etablissements', '/etablissements')).toBe(true);
    expect(isActiveItem('/etablissements', '/etablissements/42/modifier')).toBe(
      true,
    );
    expect(isActiveItem('/etablissements', '/etablissements-archives')).toBe(
      false,
    );
  });
});

describe('navItemsFor', () => {
  it('opens the establishments to the super admin and the sheet to the responsable', () => {
    const available = (role: UserRole) =>
      navItemsFor(role)
        .filter((item) => item.isAvailable)
        .map((item) => item.href);
    expect(available(UserRole.SUPER_ADMIN)).toEqual(['/', '/etablissements']);
    expect(available(UserRole.RESPONSABLE)).toEqual(['/', '/fiche']);
  });
});
