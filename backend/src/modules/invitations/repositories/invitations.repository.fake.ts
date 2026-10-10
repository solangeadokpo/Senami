import { randomUUID } from 'node:crypto';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type {
  InvitationsRepository,
  Invitee,
  StoredInvitation,
} from './invitations.repository.js';

interface FakeInvitation {
  invitationId: string;
  userId: string;
  tokenHash: Buffer;
  invitedBy: string | null;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}

export class FakeInvitationsRepository implements InvitationsRepository {
  readonly invitees = new Map<
    string,
    Invitee & { passwordHash: string | null }
  >();
  readonly invitations: FakeInvitation[] = [];

  addInvitee(invitee: Invitee): void {
    this.invitees.set(invitee.userId, { ...invitee, passwordHash: null });
  }

  replace(
    invitation: {
      userId: string;
      tokenHash: Buffer;
      invitedBy: string | null;
      expiresAt: Date;
    },
    at: Date,
  ) {
    for (const pending of this.invitations) {
      if (
        pending.userId === invitation.userId &&
        pending.acceptedAt === null &&
        pending.revokedAt === null
      ) {
        pending.revokedAt = at;
      }
    }
    this.invitations.push({
      ...invitation,
      invitationId: randomUUID(),
      acceptedAt: null,
      revokedAt: null,
    });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: Buffer): Promise<StoredInvitation | undefined> {
    const found = this.invitations.find((invitation) =>
      invitation.tokenHash.equals(tokenHash),
    );
    const invitee =
      found === undefined ? undefined : this.invitees.get(found.userId);
    if (found === undefined || invitee === undefined)
      return Promise.resolve(undefined);
    const { passwordHash: _passwordHash, ...publicInvitee } = invitee;
    return Promise.resolve({
      invitationId: found.invitationId,
      expiresAt: found.expiresAt,
      acceptedAt: found.acceptedAt,
      revokedAt: found.revokedAt,
      invitee: publicInvitee,
    });
  }

  findInvitee(userId: string): Promise<Invitee | undefined> {
    const invitee = this.invitees.get(userId);
    if (invitee === undefined) return Promise.resolve(undefined);
    const { passwordHash: _passwordHash, ...publicInvitee } = invitee;
    return Promise.resolve(publicInvitee);
  }

  accept(
    invitationId: string,
    passwordHash: string,
    at: Date,
  ): Promise<boolean> {
    const invitation = this.invitations.find(
      (candidate) => candidate.invitationId === invitationId,
    );
    if (
      invitation === undefined ||
      invitation.acceptedAt !== null ||
      invitation.revokedAt !== null ||
      invitation.expiresAt <= at
    ) {
      return Promise.resolve(false);
    }
    const invitee = this.invitees.get(invitation.userId);
    if (invitee?.status !== UserStatus.INVITED) return Promise.resolve(false);
    invitation.acceptedAt = at;
    invitee.status = UserStatus.ACTIVE;
    invitee.passwordHash = passwordHash;
    return Promise.resolve(true);
  }
}
