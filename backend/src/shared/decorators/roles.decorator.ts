import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@shared/enums/user-role.enum.js';

export const ROLES = 'senami:roles';

/** Restricts a route to these roles. Without it, any authenticated user. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
