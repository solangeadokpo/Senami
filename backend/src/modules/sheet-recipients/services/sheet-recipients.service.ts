import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';
import { RecipientList } from '@modules/sheet-recipients/recipient-list.enum.js';
import {
  type RecipientLists,
  SHEET_RECIPIENTS_REPOSITORY,
  type SheetRecipientsRepository,
} from '@modules/sheet-recipients/repositories/sheet-recipients.repository.js';
import {
  NoPrimaryRecipientError,
  RecipientEmailDuplicatedError,
} from '@modules/sheet-recipients/sheet-recipients.errors.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  type TransactionScope,
  UNIT_OF_WORK,
  type UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';

export interface SheetRecipientsView extends RecipientLists {
  /** null: the establishment has no row yet. */
  updatedAt: Date | null;
}

const LISTS = Object.values(RecipientList);

/** ETB-03: who receives the sheets of an establishment. */
@Injectable()
export class SheetRecipientsService {
  constructor(
    @Inject(SHEET_RECIPIENTS_REPOSITORY)
    private readonly repository: SheetRecipientsRepository,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async find(actor: AuthenticatedUser): Promise<SheetRecipientsView> {
    const row = await this.repository.find(tenantOf(actor));
    return row ?? { to: [], cc: [], bcc: [], updatedAt: null };
  }

  /** Replaces the three lists; an unchanged replacement writes nothing. */
  async replace(
    actor: AuthenticatedUser,
    lists: RecipientLists,
    client: ClientDetails,
  ): Promise<SheetRecipientsView> {
    const establishmentId = tenantOf(actor);
    assertValid(lists);
    const current = await this.repository.find(establishmentId);
    const changed = LISTS.filter(
      (list) => current === undefined || !sameList(current[list], lists[list]),
    );
    if (current !== undefined && changed.length === 0) return current;

    return this.unitOfWork.run(async (scope) => {
      const saved = await this.repository.save(
        establishmentId,
        lists,
        this.clock.now(),
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.SHEET_RECIPIENTS_UPDATED,
          actor,
          target: { type: 'establishment', id: establishmentId },
          establishmentId,
          // Counts, never an email.
          details: {
            changed,
            counts: {
              to: lists.to.length,
              cc: lists.cc.length,
              bcc: lists.bcc.length,
            },
          },
          client,
        },
        scope,
      );
      return saved;
    });
  }

  /** At the creation of an establishment (F4): its responsable receives the sheets. */
  async initialise(
    establishmentId: string,
    responsableEmail: string,
    scope: TransactionScope,
  ): Promise<void> {
    await this.repository.save(
      establishmentId,
      { to: [responsableEmail], cc: [], bcc: [] },
      this.clock.now(),
      scope,
    );
  }
}

/** The route roles keep the super admin out; this keeps the types honest. */
function tenantOf(actor: AuthenticatedUser): string {
  if (actor.establishmentId === null) throw new RoleNotAllowedError();
  return actor.establishmentId;
}

function assertValid(lists: RecipientLists): void {
  if (lists.to.length === 0) throw new NoPrimaryRecipientError();
  const seen = new Set<string>();
  for (const list of LISTS) {
    lists[list].forEach((email, index) => {
      const key = email.toLowerCase();
      if (seen.has(key)) throw new RecipientEmailDuplicatedError(list, index);
      seen.add(key);
    });
  }
}

/** Same emails in the same order, case ignored (the column is citext). */
function sameList(a: string[], b: string[]): boolean {
  return (
    a.length === b.length &&
    a.every((email, i) => email.toLowerCase() === b[i]?.toLowerCase())
  );
}
