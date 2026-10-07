import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '@shared/interfaces/authenticated-user.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user === undefined) {
      // A @Public() route asking for the user: a programming error.
      throw new Error('@CurrentUser() used on a route without authentication');
    }
    return user;
  },
);
