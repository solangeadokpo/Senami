import { UserRole } from '@shared/enums/user-role.enum';
import { enumValue } from '@shared/utils/enum-value';

/** What the shell shows of the signed-in user. */
export interface ShellUser {
  firstName: string;
  lastName: string;
  role: UserRole;
  establishmentName: string | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.INTERVENANT]: 'Intervenant',
  [UserRole.RESPONSABLE]: 'Responsable d’établissement',
  [UserRole.SUPER_ADMIN]: 'Super administrateur',
};

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function toUserRole(value: string): UserRole {
  const role = enumValue(UserRole, value);
  if (role === undefined) throw new Error(`Unknown role ${value}`);
  return role;
}

export function initialsOf(
  user: Pick<ShellUser, 'firstName' | 'lastName'>,
): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
