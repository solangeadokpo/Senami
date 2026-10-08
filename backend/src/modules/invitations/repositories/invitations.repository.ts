import type { UserRole } from '@shared/enums/user-role.enum.js';
import type { UserStatus } from '@shared/enums/user-status.enum.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';

/** The invited user and their establishment, as the email and the page show them. */
export interface Invitee {
  userId: string;
  email: string;
  firstName: string;
  role: UserRole;
  status: UserStatus;
  establishmentId: string | null;
  establishmentName: string | null;
  establishmentCity: string | null;
}

export interface StoredInvitation {
  invitationId: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  invitee: Invitee;
}

export interface InvitationsRepository {
  /** Revokes the pending invitation of the user, if any, then adds this one. */
  replace(
    invitation: {
      userId: string;
      tokenHash: Buffer;
      invitedBy: string | null;
      expiresAt: Date;
    },
    at: Date,
    scope?: TransactionScope,
  ): Promise<void>;
  findByTokenHash(tokenHash: Buffer): Promise<StoredInvitation | undefined>;
  findInvitee(userId: string): Promise<Invitee | undefined>;
  /**
   * Accepts a pending, unexpired invitation and activates its user with the
   * password. false when it changed in between (a concurrent acceptance).
   */
  accept(
    invitationId: string,
    passwordHash: string,
    at: Date,
    scope?: TransactionScope,
  ): Promise<boolean>;
}

export const INVITATIONS_REPOSITORY = Symbol('INVITATIONS_REPOSITORY');
