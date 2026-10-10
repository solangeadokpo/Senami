import { randomUUID } from 'node:crypto';
import { FakeAuditRepository } from '@modules/audit/repositories/audit.repository.fake.js';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';
import { RecipientList } from '@modules/sheet-recipients/recipient-list.enum.js';
import { FakeSheetRecipientsRepository } from '@modules/sheet-recipients/repositories/sheet-recipients.repository.fake.js';
import {
  NoPrimaryRecipientError,
  RecipientEmailDuplicatedError,
} from '@modules/sheet-recipients/sheet-recipients.errors.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { FakeClock } from '@shared/testing/fake-clock.js';
import { FakeUnitOfWork } from '@shared/testing/fake-unit-of-work.js';
import { SheetRecipientsService } from './sheet-recipients.service.js';

const client = { ipAddress: '203.0.113.7', userAgent: 'Vitest' };
const ESTABLISHMENT_ID = randomUUID();
const SCOPE = { kind: 'transaction-scope' } as const;

describe('SheetRecipientsService', () => {
  let clock: FakeClock;
  let repository: FakeSheetRecipientsRepository;
  let audit: FakeAuditRepository;
  let unitOfWork: FakeUnitOfWork;
  let service: SheetRecipientsService;

  beforeEach(() => {
    clock = new FakeClock();
    repository = new FakeSheetRecipientsRepository();
    audit = new FakeAuditRepository();
    unitOfWork = new FakeUnitOfWork();
    service = new SheetRecipientsService(
      repository,
      new AuditService(audit, clock),
      clock,
      unitOfWork,
    );
  });

  const userOf = (
    role: UserRole,
    establishmentId: string | null = ESTABLISHMENT_ID,
  ): AuthenticatedUser => ({
    userId: randomUUID(),
    role,
    establishmentId,
    sessionId: randomUUID(),
    channel: SessionChannel.BACKOFFICE,
  });
  const responsable = userOf(UserRole.RESPONSABLE);

  describe('find', () => {
    it("reads the lists of the user's establishment", async () => {
      await service.initialise(ESTABLISHMENT_ID, 'direction@ecole.fr', SCOPE);
      await service.initialise(randomUUID(), 'autre@ecole.fr', SCOPE);

      expect(await service.find(userOf(UserRole.INTERVENANT))).toEqual({
        to: ['direction@ecole.fr'],
        cc: [],
        bcc: [],
        updatedAt: clock.now(),
      });
    });

    it('reads three empty lists without a row', async () => {
      expect(await service.find(responsable)).toEqual({
        to: [],
        cc: [],
        bcc: [],
        updatedAt: null,
      });
    });

    it('refuses a user without an establishment', async () => {
      await expect(
        service.find(userOf(UserRole.SUPER_ADMIN, null)),
      ).rejects.toBeInstanceOf(RoleNotAllowedError);
    });
  });

  describe('replace', () => {
    beforeEach(async () => {
      await service.initialise(ESTABLISHMENT_ID, 'direction@ecole.fr', SCOPE);
      repository.saves = 0;
    });

    it('replaces the lists and audits the changed lists and the counts, no email', async () => {
      const saved = await service.replace(
        responsable,
        {
          to: ['direction@ecole.fr'],
          cc: ['infirmerie@ecole.fr', 'vie-scolaire@ecole.fr'],
          bcc: [],
        },
        client,
      );

      expect(saved).toMatchObject({
        to: ['direction@ecole.fr'],
        cc: ['infirmerie@ecole.fr', 'vie-scolaire@ecole.fr'],
        bcc: [],
      });
      expect(unitOfWork.runs).toBe(1);
      expect(audit.rows).toEqual([
        expect.objectContaining({
          action: AuditAction.SHEET_RECIPIENTS_UPDATED,
          actorUserId: responsable.userId,
          establishmentId: ESTABLISHMENT_ID,
          targetType: 'establishment',
          targetId: ESTABLISHMENT_ID,
          details: {
            changed: [RecipientList.CC],
            counts: { to: 1, cc: 2, bcc: 0 },
          },
        }),
      ]);
      expect(JSON.stringify(audit.rows)).not.toContain('@ecole.fr');
    });

    it('writes nothing and audits nothing when the lists are unchanged, case ignored', async () => {
      const saved = await service.replace(
        responsable,
        { to: ['Direction@Ecole.fr'], cc: [], bcc: [] },
        client,
      );

      expect(saved.to).toEqual(['direction@ecole.fr']);
      expect(repository.saves).toBe(0);
      expect(audit.rows).toEqual([]);
    });

    it('inserts the row of an establishment that has none', async () => {
      const other = userOf(UserRole.RESPONSABLE, randomUUID());

      await service.replace(
        other,
        { to: ['direction@autre.fr'], cc: [], bcc: [] },
        client,
      );

      expect(await service.find(other)).toMatchObject({
        to: ['direction@autre.fr'],
      });
      expect(audit.rows[0]?.details).toEqual({
        changed: [RecipientList.TO, RecipientList.CC, RecipientList.BCC],
        counts: { to: 1, cc: 0, bcc: 0 },
      });
    });

    it('refuses an empty main list', async () => {
      await expect(
        service.replace(
          responsable,
          { to: [], cc: ['infirmerie@ecole.fr'], bcc: [] },
          client,
        ),
      ).rejects.toBeInstanceOf(NoPrimaryRecipientError);
      expect(repository.saves).toBe(0);
    });

    it('refuses a duplicate in one list, naming the list and the index', async () => {
      const refused = service.replace(
        responsable,
        {
          to: ['direction@ecole.fr'],
          cc: ['infirmerie@ecole.fr', 'INFIRMERIE@ecole.fr'],
          bcc: [],
        },
        client,
      );

      await expect(refused).rejects.toBeInstanceOf(
        RecipientEmailDuplicatedError,
      );
      await expect(refused).rejects.toMatchObject({
        details: { list: RecipientList.CC, index: 1 },
      });
    });

    it('refuses a duplicate across two lists, case ignored', async () => {
      await expect(
        service.replace(
          responsable,
          {
            to: ['direction@ecole.fr'],
            cc: [],
            bcc: ['Direction@ecole.fr'],
          },
          client,
        ),
      ).rejects.toMatchObject({
        code: 'RECIPIENT_EMAIL_DUPLICATED',
        details: { list: RecipientList.BCC, index: 0 },
      });
      expect(repository.saves).toBe(0);
    });

    it('keeps the case typed', async () => {
      const saved = await service.replace(
        responsable,
        { to: ['Direction@Ecole.fr'], cc: ['Infirmerie@ecole.fr'], bcc: [] },
        client,
      );

      expect(saved.cc).toEqual(['Infirmerie@ecole.fr']);
    });
  });

  it('initialises the row with the responsable as main recipient', async () => {
    await service.initialise(ESTABLISHMENT_ID, 'l.martin@ecole.fr', SCOPE);

    expect(repository.rows.get(ESTABLISHMENT_ID)).toEqual({
      to: ['l.martin@ecole.fr'],
      cc: [],
      bcc: [],
      updatedAt: clock.now(),
    });
  });
});
