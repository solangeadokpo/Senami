import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import type { AuthenticatedRequest } from '@shared/interfaces/authenticated-user.interface.js';
import { Roles } from '@shared/decorators/roles.decorator.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';
import { RolesGuard } from './roles.guard.js';

class ProbeController {
  anyone(this: void): void {}

  @Roles(UserRole.RESPONSABLE, UserRole.SUPER_ADMIN)
  administrators(this: void): void {}
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  function run(role: UserRole, handler: 'anyone' | 'administrators'): boolean {
    const request: Pick<AuthenticatedRequest, 'user'> = {
      user: {
        userId: 'u1',
        role,
        establishmentId: 'e1',
        sessionId: 's1',
        channel: SessionChannel.MOBILE,
      },
    };
    return guard.canActivate(
      new ExecutionContextHost(
        [request],
        ProbeController,
        ProbeController.prototype[handler],
      ),
    );
  }

  it('admits any role on a route without @Roles()', () => {
    expect(run(UserRole.INTERVENANT, 'anyone')).toBe(true);
  });

  it.each([UserRole.RESPONSABLE, UserRole.SUPER_ADMIN] as const)(
    'admits a %s',
    (role) => {
      expect(run(role, 'administrators')).toBe(true);
    },
  );

  it('refuses a role the route does not list', () => {
    expect(() => run(UserRole.INTERVENANT, 'administrators')).toThrow(
      RoleNotAllowedError,
    );
  });
});
