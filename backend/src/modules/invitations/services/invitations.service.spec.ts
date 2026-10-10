import { randomUUID } from 'node:crypto';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { UserNotFoundError } from '@modules/auth/auth.errors.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';
import { EmailProviderUnavailableError } from '@modules/email/email.errors.js';
import { FakeEmailSender } from '@modules/email/senders/fake-email-sender.js';
import {
  InvitationExpiredError,
  InvitationInvalidError,
  UserAlreadyActiveError,
} from '@modules/invitations/invitations.errors.js';
import type { Invitee } from '@modules/invitations/repositories/invitations.repository.js';
import { FakeInvitationsRepository } from '@modules/invitations/repositories/invitations.repository.fake.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { DAY_MS, FakeClock } from '@shared/testing/fake-clock.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import { InvitationsService } from './invitations.service.js';

const ESTABLISHMENT_ID = '7d3f6a2e-1c4b-4e8a-9f20-5b6c7d8e9f01';
const client = { ipAddress: '203.0.113.7', userAgent: 'Vitest' };

describe('InvitationsService', () => {
  let clock: FakeClock;
  let repository: FakeInvitationsRepository;
  let email: FakeEmailSender;
  let audit: FakeAuditRepository;
  let unitOfWork: FakeUnitOfWork;
  let service: InvitationsService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeInvitationsRepository();
    email = new FakeEmailSender();
    audit = new FakeAuditRepository();
    unitOfWork = new FakeUnitOfWork();
    service = new InvitationsService(
      repository,
      email,
      new PasswordHasherService(),
      new AuditService(audit, clock),
      { webAppUrl: 'http://app.localhost:3001' },
      clock,
      unitOfWork,
    );
  });

  function addInvitee(overrides: Partial<Invitee> = {}): Invitee {
    const invitee: Invitee = {
      userId: randomUUID(),
      email: `${randomUUID()}@ecole.test`,
      firstName: 'Claire',
      role: UserRole.RESPONSABLE,
      status: UserStatus.INVITED,
      establishmentId: ESTABLISHMENT_ID,
      establishmentName: 'École Saint-Denis',
      establishmentCity: 'Lille',
      ...overrides,
    };
    repository.addInvitee(invitee);
    return invitee;
  }

  async function invite(invitee: Invitee) {
    const issued = await unitOfWork.run((scope) =>
      service.issue(invitee.userId, null, scope),
    );
    await service.send(invitee, issued);
    return issued;
  }

  function actor(
    role: UserRole,
    establishmentId: string | null = ESTABLISHMENT_ID,
  ): AuthenticatedUser {
    return {
      userId: randomUUID(),
      role,
      establishmentId,
      sessionId: randomUUID(),
      channel: SessionChannel.BACKOFFICE,
    };
  }

  it('sends a link valid 72 hours, the token after the #, never stored in clear', async () => {
    const invitee = addInvitee();
    const { token, expiresAt } = await invite(invitee);

    const sent = email.lastTo(invitee.email);
    expect(sent?.text).toContain(
      `http://app.localhost:3001/invitation#${token}`,
    );
    expect(expiresAt.getTime() - clock.now().getTime()).toBe(3 * DAY_MS);
    expect(repository.invitations[0]?.tokenHash.toString('utf8')).not.toContain(
      token,
    );
  });

  it('reports a refused email without failing', async () => {
    const invitee = addInvitee();
    const issued = await unitOfWork.run((scope) =>
      service.issue(invitee.userId, null, scope),
    );
    email.failNext = true;

    await expect(service.send(invitee, issued)).resolves.toBe(false);
  });

  it('shows a pending invitation', async () => {
    const invitee = addInvitee();
    const { token } = await invite(invitee);

    await expect(service.lookup(token)).resolves.toMatchObject({
      firstName: 'Claire',
      email: invitee.email,
      establishmentName: 'École Saint-Denis',
    });
  });

  it('activates the user with the password, once, and audits it', async () => {
    const invitee = addInvitee();
    const { token } = await invite(invitee);

    await service.accept(token, 'un mot de passe solide', client);

    expect(repository.invitees.get(invitee.userId)?.status).toBe(
      UserStatus.ACTIVE,
    );
    expect(repository.invitees.get(invitee.userId)?.passwordHash).toMatch(
      /^\$argon2id\$/,
    );
    expect(audit.rows).toEqual([
      expect.objectContaining({
        action: AuditAction.INVITATION_ACCEPTED,
        actorUserId: invitee.userId,
      }),
    ]);
    await expect(
      service.accept(token, 'un autre mot de passe', client),
    ).rejects.toBeInstanceOf(InvitationInvalidError);
  });

  it('refuses an unknown token, an expired one and a replaced one', async () => {
    const invitee = addInvitee();
    const first = await invite(invitee);
    const second = await invite(invitee);

    await expect(
      service.lookup('unknown-token-unknown-token'),
    ).rejects.toBeInstanceOf(InvitationInvalidError);
    await expect(service.lookup(first.token)).rejects.toBeInstanceOf(
      InvitationExpiredError,
    );
    clock.advance(3 * DAY_MS);
    await expect(service.lookup(second.token)).rejects.toBeInstanceOf(
      InvitationExpiredError,
    );
  });

  describe('resend', () => {
    it('lets a responsable resend to a user of their establishment', async () => {
      const invitee = addInvitee({ role: UserRole.INTERVENANT });
      const old = await invite(invitee);

      await service.resend(actor(UserRole.RESPONSABLE), invitee.userId, client);

      expect(email.sent).toHaveLength(2);
      await expect(service.lookup(old.token)).rejects.toBeInstanceOf(
        InvitationExpiredError,
      );
      expect(audit.rows.at(-1)).toMatchObject({
        action: AuditAction.INVITATION_SENT,
        targetId: invitee.userId,
      });
    });

    it('hides the users of another establishment', async () => {
      const invitee = addInvitee({ establishmentId: randomUUID() });

      await expect(
        service.resend(actor(UserRole.RESPONSABLE), invitee.userId, client),
      ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('refuses an active user', async () => {
      const invitee = addInvitee({ status: UserStatus.ACTIVE });

      await expect(
        service.resend(
          actor(UserRole.SUPER_ADMIN, null),
          invitee.userId,
          client,
        ),
      ).rejects.toBeInstanceOf(UserAlreadyActiveError);
    });

    it('fails when the email is refused', async () => {
      const invitee = addInvitee();
      email.failNext = true;

      await expect(
        service.resend(
          actor(UserRole.SUPER_ADMIN, null),
          invitee.userId,
          client,
        ),
      ).rejects.toBeInstanceOf(EmailProviderUnavailableError);
    });
  });
});
