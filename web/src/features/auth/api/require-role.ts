import 'server-only';
import { notFound } from 'next/navigation';
import {
  type CurrentUser,
  getCurrentUser,
} from '@features/auth/api/current-user.api';
import { UserRole } from '@shared/enums/user-role.enum';
import { enumValue } from '@shared/utils/enum-value';

/** A page of another role answers 404: its existence is not disclosed. */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user === null || enumValue(UserRole, user.role) !== role) notFound();
  return user;
}
