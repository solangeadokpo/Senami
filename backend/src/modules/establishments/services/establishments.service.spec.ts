import { randomUUID } from 'node:crypto';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';
import { FakeEmailSender } from '@modules/email/senders/fake-email-sender.js';
import {
  EstablishmentAlreadySuspendedError,
  EstablishmentNotFoundError,
  EstablishmentNotSuspendedError,
  LogoInvalidError,
  NoCurrentPlanPriceError,
  UserEmailAlreadyUsedError,
} from '@modules/establishments/establishments.errors.js';
import { FakeEstablishmentsRepository } from '@modules/establishments/repositories/establishments.repository.fake.js';
import { FakeInvitationsRepository } from '@modules/invitations/repositories/invitations.repository.fake.js';
import { InvitationsService } from '@modules/invitations/services/invitations.service.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { FakeClock } from '@shared/testing/fake-clock.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import {
  type CreateInput,
  EstablishmentsService,
} from './establishments.service.js';

const client = { ipAddress: '203.0.113.7', userAgent: 'Vitest' };
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('image'),
]);

const INPUT: CreateInput = {
  establishment: {
    name: 'École Sainte-Marie',
    type: EstablishmentType.PRIMAIRE,
    addressLine: '3 rue des Écoles',
    postalCode: '59000',
    city: 'Lille',
    phone: null,
    email: null,
    approxStudentCount: null,
  },
  responsable: {
    firstName: 'Léa',
    lastName: 'Martin',
    email: 'l.martin@ecole.fr',
  },
};

describe('EstablishmentsService', () => {
  let clock: FakeClock;
  let repository: FakeEstablishmentsRepository;
  let email: FakeEmailSender;
  let audit: FakeAuditRepository;
  let unitOfWork: FakeUnitOfWork;
  let service: EstablishmentsService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeEstablishmentsRepository();
    email = new FakeEmailSender();
    audit = new FakeAuditRepository();
    unitOfWork = new FakeUnitOfWork();
    const auditService = new AuditService(audit, clock);
    service = new EstablishmentsService(
      repository,
      new InvitationsService(
        new FakeInvitationsRepository(),
        email,
        new PasswordHasherService(),
        auditService,
        { webAppUrl: 'http://app.localhost:3001' },
        clock,
        unitOfWork,
      ),
      auditService,
      clock,
      unitOfWork,
    );
  });

  const superAdmin: AuthenticatedUser = {
    userId: randomUUID(),
    role: UserRole.SUPER_ADMIN,
    establishmentId: null,
    sessionId: randomUUID(),
    channel: SessionChannel.BACKOFFICE,
  };
  const responsableOf = (establishmentId: string): AuthenticatedUser => ({
    userId: randomUUID(),
    role: UserRole.RESPONSABLE,
    establishmentId,
    sessionId: randomUUID(),
    channel: SessionChannel.BACKOFFICE,
  });

  describe('create', () => {
    it('creates the establishment, a one-year subscription and the invited responsable', async () => {
      const { establishment, invitation } = await service.create(
        superAdmin,
        INPUT,
        client,
      );

      const [created] = repository.created;
      expect(created?.subscription.endsAt).toEqual(
        new Date('2027-10-06T08:00:00.000Z'),
      );
      expect(created?.createdBy).toBe(superAdmin.userId);
      expect(establishment.responsable).toMatchObject({
        email: 'l.martin@ecole.fr',
      });
      expect(invitation).toEqual({
        sent: true,
        expiresAt: new Date('2026-10-09T08:00:00.000Z'),
      });
      expect(unitOfWork.runs).toBe(1);
    });

    it('emails the invitation after the transaction, and audits the creation', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);

      expect(email.lastTo('l.martin@ecole.fr')?.subject).toBe(
        'Activez votre compte Sènami · École Sainte-Marie',
      );
      expect(audit.rows).toEqual([
        expect.objectContaining({
          action: AuditAction.ESTABLISHMENT_CREATED,
          actorUserId: superAdmin.userId,
          establishmentId: establishment.id,
        }),
      ]);
    });

    it('keeps the establishment when the email fails', async () => {
      email.failNext = true;

      const { invitation } = await service.create(superAdmin, INPUT, client);

      expect(invitation.sent).toBe(false);
      expect(repository.establishments.size).toBe(1);
    });

    it('refuses an email that already belongs to an account', async () => {
      repository.usedEmails.add('l.martin@ecole.fr');

      await expect(
        service.create(superAdmin, INPUT, client),
      ).rejects.toBeInstanceOf(UserEmailAlreadyUsedError);
      expect(repository.created).toHaveLength(0);
    });

    it('needs a price in force', async () => {
      repository.currentPrice = undefined;

      await expect(
        service.create(superAdmin, INPUT, client),
      ).rejects.toBeInstanceOf(NoCurrentPlanPriceError);
    });
  });

  it('lists with filters and pagination', async () => {
    await service.create(superAdmin, INPUT, client);
    await service.create(
      superAdmin,
      {
        ...INPUT,
        establishment: {
          ...INPUT.establishment,
          name: 'Collège Victor-Hugo',
          city: 'Lyon',
        },
        responsable: { ...INPUT.responsable, email: 'h@vh.fr' },
      },
      client,
    );

    const page = await service.list({ page: 1, limit: 1, city: 'Lyon' });

    expect(page.items.map((item) => item.name)).toEqual([
      'Collège Victor-Hugo',
    ]);
    expect(page.meta).toMatchObject({ total: 1, page: 1, limit: 1 });
  });

  describe('access', () => {
    it('lets a responsable read and update their establishment, not its type', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);
      const responsable = responsableOf(establishment.id);

      const updated = await service.update(
        responsable,
        establishment.id,
        { phone: '03 20 00 00 00' },
        client,
      );

      expect(updated.phone).toBe('03 20 00 00 00');
      expect(audit.rows.at(-1)).toMatchObject({
        action: AuditAction.ESTABLISHMENT_UPDATED,
        details: { fields: ['phone'] },
      });
      await expect(
        service.update(
          responsable,
          establishment.id,
          { type: EstablishmentType.COLLEGE },
          client,
        ),
      ).rejects.toBeInstanceOf(RoleNotAllowedError);
    });

    it('hides another establishment from a responsable', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);

      await expect(
        service.detail(responsableOf(randomUUID()), establishment.id),
      ).rejects.toBeInstanceOf(EstablishmentNotFoundError);
    });
  });

  describe('suspension', () => {
    it('suspends with its reason, then reactivates, both audited', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);

      await service.suspend(
        superAdmin,
        establishment.id,
        'Abonnement impayé',
        client,
      );
      expect(await repository.findDetail(establishment.id)).toMatchObject({
        status: EstablishmentStatus.SUSPENDED,
        suspensionReason: 'Abonnement impayé',
        suspendedAt: clock.now(),
      });
      await expect(
        service.suspend(superAdmin, establishment.id, 'encore', client),
      ).rejects.toBeInstanceOf(EstablishmentAlreadySuspendedError);

      await service.reactivate(superAdmin, establishment.id, client);
      expect(await repository.findDetail(establishment.id)).toMatchObject({
        status: EstablishmentStatus.ACTIVE,
        suspensionReason: null,
      });
      await expect(
        service.reactivate(superAdmin, establishment.id, client),
      ).rejects.toBeInstanceOf(EstablishmentNotSuspendedError);
      expect(audit.rows.map((row) => row.action)).toEqual([
        AuditAction.ESTABLISHMENT_CREATED,
        AuditAction.ESTABLISHMENT_SUSPENDED,
        AuditAction.ESTABLISHMENT_REACTIVATED,
      ]);
    });
  });

  describe('logo', () => {
    it('stores a PNG and gives it back', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);

      await service.setLogo(
        superAdmin,
        establishment.id,
        { buffer: PNG },
        client,
      );

      await expect(service.logo(superAdmin, establishment.id)).resolves.toEqual(
        {
          content: PNG,
          mimeType: 'image/png',
        },
      );
    });

    it('refuses a missing file', async () => {
      const { establishment } = await service.create(superAdmin, INPUT, client);

      await expect(
        service.setLogo(superAdmin, establishment.id, undefined, client),
      ).rejects.toBeInstanceOf(LogoInvalidError);
    });
  });
});
