import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type MailConfig, mailConfig } from '@config/index.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { UserNotFoundError } from '@modules/auth/auth.errors.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';
import { EmailProviderUnavailableError } from '@modules/email/email.errors.js';
import { invitationEmail } from '@modules/email/templates/invitation.template.js';
import {
  InvitationExpiredError,
  InvitationInvalidError,
  UserAlreadyActiveError,
} from '@modules/invitations/invitations.errors.js';
import {
  INVITATIONS_REPOSITORY,
  type InvitationsRepository,
  type Invitee,
  type StoredInvitation,
} from '@modules/invitations/repositories/invitations.repository.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  EMAIL_SENDER,
  type EmailSender,
} from '@shared/interfaces/email-sender.interface.js';
import {
  type TransactionScope,
  UNIT_OF_WORK,
  type UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';

/** MOB-01: an invitation link is valid 72 hours. */
export const INVITATION_HOURS = 72;
const HOUR_MS = 3_600_000;

/** Given once, in the email; only its hash is stored. */
export interface IssuedInvitation {
  token: string;
  expiresAt: Date;
}

export interface InvitationView {
  firstName: string;
  email: string;
  role: UserRole;
  establishmentName: string | null;
  establishmentCity: string | null;
  expiresAt: Date;
}

@Injectable()
export class InvitationsService {
  constructor(
    @Inject(INVITATIONS_REPOSITORY)
    private readonly repository: InvitationsRepository,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    private readonly passwords: PasswordHasherService,
    private readonly audit: AuditService,
    @Inject(mailConfig.KEY)
    private readonly config: Pick<MailConfig, 'webAppUrl'>,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  /** In the transaction of the caller, which sends the email after commit. */
  async issue(
    userId: string,
    invitedBy: string | null,
    scope: TransactionScope,
  ): Promise<IssuedInvitation> {
    const now = this.clock.now();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + INVITATION_HOURS * HOUR_MS);
    await this.repository.replace(
      { userId, tokenHash: hashOf(token), invitedBy, expiresAt },
      now,
      scope,
    );
    return { token, expiresAt };
  }

  /** false when the provider refused: the invitation stays valid, resend it. */
  async send(invitee: Invitee, invitation: IssuedInvitation): Promise<boolean> {
    try {
      await this.email.send(
        invitationEmail({
          to: invitee.email,
          firstName: invitee.firstName,
          role: invitee.role,
          establishmentName: invitee.establishmentName ?? 'Sènami',
          establishmentCity: invitee.establishmentCity ?? '',
          // After the #: browsers never send it, so no log holds the token.
          link: `${this.config.webAppUrl}/invitation#${invitation.token}`,
          expiresAt: invitation.expiresAt,
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof EmailProviderUnavailableError) return false;
      throw error;
    }
  }

  async lookup(token: string): Promise<InvitationView> {
    const { invitee, expiresAt } = await this.findUsable(token);
    return {
      firstName: invitee.firstName,
      email: invitee.email,
      role: invitee.role,
      establishmentName: invitee.establishmentName,
      establishmentCity: invitee.establishmentCity,
      expiresAt,
    };
  }

  async accept(
    token: string,
    password: string,
    client: ClientDetails,
  ): Promise<void> {
    const invitation = await this.findUsable(token);
    const passwordHash = await this.passwords.hash(password);

    await this.unitOfWork.run(async (scope) => {
      const accepted = await this.repository.accept(
        invitation.invitationId,
        passwordHash,
        this.clock.now(),
        scope,
      );
      if (!accepted) throw new InvitationInvalidError();
      await this.audit.record(
        {
          action: AuditAction.INVITATION_ACCEPTED,
          actor: {
            userId: invitation.invitee.userId,
            role: invitation.invitee.role,
          },
          target: { type: 'user', id: invitation.invitee.userId },
          establishmentId: invitation.invitee.establishmentId,
          client,
        },
        scope,
      );
    });
  }

  /** A new link, the previous one stops working. Throws when not sent. */
  async resend(
    actor: AuthenticatedUser,
    userId: string,
    client: ClientDetails,
  ): Promise<{ expiresAt: Date }> {
    const invitee = await this.repository.findInvitee(userId);
    const reachable =
      invitee !== undefined &&
      (actor.role === UserRole.SUPER_ADMIN ||
        (invitee.establishmentId !== null &&
          invitee.establishmentId === actor.establishmentId));
    if (!reachable) throw new UserNotFoundError(userId);
    if (invitee.status !== UserStatus.INVITED) {
      throw new UserAlreadyActiveError(userId);
    }

    const invitation = await this.unitOfWork.run(async (scope) => {
      const issued = await this.issue(userId, actor.userId, scope);
      await this.audit.record(
        {
          action: AuditAction.INVITATION_SENT,
          actor,
          target: { type: 'user', id: userId },
          establishmentId: invitee.establishmentId,
          client,
        },
        scope,
      );
      return issued;
    });
    if (!(await this.send(invitee, invitation))) {
      throw new EmailProviderUnavailableError();
    }
    return { expiresAt: invitation.expiresAt };
  }

  private async findUsable(token: string): Promise<StoredInvitation> {
    const invitation = await this.repository.findByTokenHash(hashOf(token));
    if (
      invitation === undefined ||
      invitation.acceptedAt !== null ||
      invitation.invitee.status !== UserStatus.INVITED
    ) {
      throw new InvitationInvalidError();
    }
    if (
      invitation.revokedAt !== null ||
      invitation.expiresAt <= this.clock.now()
    ) {
      throw new InvitationExpiredError();
    }
    return invitation;
  }
}

function hashOf(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}
