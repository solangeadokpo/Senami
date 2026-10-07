import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '@shared/interfaces/authenticated-user.interface.js';
import type { UserRole } from '@shared/enums/user-role.enum.js';
import { ROLES } from '@shared/decorators/roles.decorator.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';

/** Global, runs after AuthGuard. A route without @Roles() admits any role. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (roles === undefined || roles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user === undefined || !roles.includes(user.role)) {
      throw new RoleNotAllowedError();
    }
    return true;
  }
}
