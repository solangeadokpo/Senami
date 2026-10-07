import type { Request } from 'express';
import type { SessionChannel } from '@shared/enums/session-channel.enum.js';
import type { UserRole } from '@shared/enums/user-role.enum.js';

/** Set on the request by AuthGuard; read with @CurrentUser(). */
export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  /** null for the super administrator. */
  establishmentId: string | null;
  sessionId: string;
  channel: SessionChannel;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
