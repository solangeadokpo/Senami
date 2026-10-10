import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database, executorOf } from '@core/database/index.js';
import {
  establishments,
  userInvitations,
  users,
} from '@database/schema/index.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type {
  InvitationsRepository,
  Invitee,
  StoredInvitation,
} from './invitations.repository.js';

// users, user_invitations and establishments are not under row level
// security: an invitation is opened before anyone is signed in.

const inviteeColumns = {
  userId: users.id,
  email: users.email,
  firstName: users.firstName,
  role: users.role,
  status: users.status,
  establishmentId: establishments.id,
  establishmentName: establishments.name,
  establishmentCity: establishments.city,
};

@Injectable()
export class DrizzleInvitationsRepository implements InvitationsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async replace(
    invitation: {
      userId: string;
      tokenHash: Buffer;
      invitedBy: string | null;
      expiresAt: Date;
    },
    at: Date,
    scope?: TransactionScope,
  ): Promise<void> {
    const executor = executorOf(this.db, scope);
    await executor
      .update(userInvitations)
      .set({ revokedAt: at })
      .where(
        and(
          eq(userInvitations.userId, invitation.userId),
          isNull(userInvitations.acceptedAt),
          isNull(userInvitations.revokedAt),
        ),
      );
    await executor.insert(userInvitations).values(invitation);
  }

  async findByTokenHash(
    tokenHash: Buffer,
  ): Promise<StoredInvitation | undefined> {
    const [row] = await this.db
      .select({
        invitationId: userInvitations.id,
        expiresAt: userInvitations.expiresAt,
        acceptedAt: userInvitations.acceptedAt,
        revokedAt: userInvitations.revokedAt,
        ...inviteeColumns,
      })
      .from(userInvitations)
      .innerJoin(users, eq(users.id, userInvitations.userId))
      .leftJoin(establishments, eq(establishments.id, users.establishmentId))
      .where(eq(userInvitations.tokenHash, tokenHash))
      .limit(1);
    if (row === undefined) return undefined;
    const { invitationId, expiresAt, acceptedAt, revokedAt, ...invitee } = row;
    return { invitationId, expiresAt, acceptedAt, revokedAt, invitee };
  }

  async findInvitee(userId: string): Promise<Invitee | undefined> {
    const [row] = await this.db
      .select(inviteeColumns)
      .from(users)
      .leftJoin(establishments, eq(establishments.id, users.establishmentId))
      .where(eq(users.id, userId))
      .limit(1);
    return row;
  }

  async accept(
    invitationId: string,
    passwordHash: string,
    at: Date,
    scope?: TransactionScope,
  ): Promise<boolean> {
    const executor = executorOf(this.db, scope);
    const accepted = await executor
      .update(userInvitations)
      .set({ acceptedAt: at })
      .where(
        and(
          eq(userInvitations.id, invitationId),
          isNull(userInvitations.acceptedAt),
          isNull(userInvitations.revokedAt),
          gt(userInvitations.expiresAt, at),
        ),
      )
      .returning({ userId: userInvitations.userId });
    const [invitation] = accepted;
    if (invitation === undefined) return false;

    const activated = await executor
      .update(users)
      .set({ passwordHash, status: UserStatus.ACTIVE, updatedAt: at })
      .where(
        and(
          eq(users.id, invitation.userId),
          eq(users.status, UserStatus.INVITED),
        ),
      )
      .returning({ id: users.id });
    return activated.length === 1;
  }
}
