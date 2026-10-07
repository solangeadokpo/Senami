import { UserRole } from '@shared/enums/user-role.enum';
import { enumValue } from './enum-value';

describe('enumValue', () => {
  it('finds the member of a value from the API', () => {
    expect(enumValue(UserRole, UserRole.RESPONSABLE)).toBe(
      UserRole.RESPONSABLE,
    );
  });

  it('gives undefined for an unknown value', () => {
    expect(enumValue(UserRole, 'unknown')).toBeUndefined();
  });
});
