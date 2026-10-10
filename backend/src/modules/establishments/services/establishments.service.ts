import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '@modules/audit/services/audit.service.js';
import { RoleNotAllowedError } from '@modules/auth/auth.errors.js';
import {
  EstablishmentAlreadySuspendedError,
  EstablishmentNotFoundError,
  EstablishmentNotSuspendedError,
  LogoInvalidError,
  LogoNotFoundError,
  NoCurrentPlanPriceError,
  UserEmailAlreadyUsedError,
} from '@modules/establishments/establishments.errors.js';
import {
  ESTABLISHMENTS_REPOSITORY,
  type EstablishmentDetail,
  type EstablishmentFields,
  type EstablishmentSummary,
  type EstablishmentsRepository,
} from '@modules/establishments/repositories/establishments.repository.js';
import {
  type CleanLogo,
  cleanLogo,
} from '@modules/establishments/utils/logo-file.js';
import { InvitationsService } from '@modules/invitations/services/invitations.service.js';
import { SheetRecipientsService } from '@modules/sheet-recipients/services/sheet-recipients.service.js';
import { PaginatedResult } from '@shared/dto/paginated-result.js';
import { AuditAction } from '@shared/enums/audit-action.enum.js';
import { BillingInterval } from '@shared/enums/billing-interval.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import {
  UNIT_OF_WORK,
  type UnitOfWork,
} from '@shared/interfaces/unit-of-work.interface.js';

export interface ListQuery {
  page: number;
  limit: number;
  search?: string | undefined;
  city?: string | undefined;
  status?: EstablishmentStatus | undefined;
}

export interface CreateInput {
  establishment: EstablishmentFields;
  responsable: { firstName: string; lastName: string; email: string };
}

export interface CreatedEstablishment {
  establishment: EstablishmentDetail;
  /** `sent: false`: the provider refused; resend from the detail page. */
  invitation: { sent: boolean; expiresAt: Date };
}

@Injectable()
export class EstablishmentsService {
  constructor(
    @Inject(ESTABLISHMENTS_REPOSITORY)
    private readonly repository: EstablishmentsRepository,
    private readonly invitations: InvitationsService,
    private readonly sheetRecipients: SheetRecipientsService,
    private readonly audit: AuditService,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWork,
  ) {}

  async list(query: ListQuery): Promise<PaginatedResult<EstablishmentSummary>> {
    const { items, total } = await this.repository.list({
      ...(query.search === undefined ? {} : { search: query.search }),
      ...(query.city === undefined ? {} : { city: query.city }),
      ...(query.status === undefined ? {} : { status: query.status }),
      offset: (query.page - 1) * query.limit,
      limit: query.limit,
    });
    return PaginatedResult.of(items, total, query.page, query.limit);
  }

  cities(): Promise<string[]> {
    return this.repository.cities();
  }

  /**
   * SA-02: the establishment, its subscription, its invited responsable, who
   * is also the main recipient of the sheets (ETB-03).
   */
  async create(
    actor: AuthenticatedUser,
    input: CreateInput,
    client: ClientDetails,
  ): Promise<CreatedEstablishment> {
    if (await this.repository.isEmailUsed(input.responsable.email)) {
      throw new UserEmailAlreadyUsedError();
    }
    const now = this.clock.now();
    const price = await this.repository.findCurrentPrice(now);
    if (price === undefined) throw new NoCurrentPlanPriceError();

    const { ids, invitation } = await this.unitOfWork.run(async (scope) => {
      const created = await this.repository.create(
        {
          establishment: input.establishment,
          responsable: input.responsable,
          subscription: {
            ...price,
            startsAt: now,
            endsAt: addInterval(
              now,
              price.billingInterval,
              price.intervalCount,
            ),
          },
          createdBy: actor.userId,
        },
        scope,
      );
      await this.sheetRecipients.initialise(
        created.establishmentId,
        input.responsable.email,
        scope,
      );
      const issued = await this.invitations.issue(
        created.responsableId,
        actor.userId,
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.ESTABLISHMENT_CREATED,
          actor,
          target: { type: 'establishment', id: created.establishmentId },
          establishmentId: created.establishmentId,
          details: { responsableId: created.responsableId },
          client,
        },
        scope,
      );
      return { ids: created, invitation: issued };
    });

    // After the commit: a rolled back creation sends nothing.
    const sent = await this.invitations.send(
      {
        userId: ids.responsableId,
        email: input.responsable.email,
        firstName: input.responsable.firstName,
        role: UserRole.RESPONSABLE,
        status: UserStatus.INVITED,
        establishmentId: ids.establishmentId,
        establishmentName: input.establishment.name,
        establishmentCity: input.establishment.city,
      },
      invitation,
    );
    return {
      establishment: await this.mustFind(ids.establishmentId),
      invitation: { sent, expiresAt: invitation.expiresAt },
    };
  }

  async detail(
    actor: AuthenticatedUser,
    establishmentId: string,
  ): Promise<EstablishmentDetail> {
    this.assertReachable(actor, establishmentId);
    return this.mustFind(establishmentId);
  }

  async update(
    actor: AuthenticatedUser,
    establishmentId: string,
    changes: Partial<EstablishmentFields>,
    client: ClientDetails,
  ): Promise<EstablishmentDetail> {
    this.assertReachable(actor, establishmentId);
    // The type sets the sheet model: the super admin decides it.
    if (changes.type !== undefined && actor.role !== UserRole.SUPER_ADMIN) {
      throw new RoleNotAllowedError();
    }
    await this.mustFind(establishmentId);
    const fields = Object.keys(changes);
    if (fields.length > 0) {
      await this.unitOfWork.run(async (scope) => {
        await this.repository.update(
          establishmentId,
          changes,
          this.clock.now(),
          scope,
        );
        await this.recordUpdate(actor, establishmentId, fields, client, scope);
      });
    }
    return this.mustFind(establishmentId);
  }

  async suspend(
    actor: AuthenticatedUser,
    establishmentId: string,
    reason: string,
    client: ClientDetails,
  ): Promise<void> {
    const status = await this.mustFindStatus(establishmentId);
    if (status === EstablishmentStatus.SUSPENDED)
      throw new EstablishmentAlreadySuspendedError();

    await this.unitOfWork.run(async (scope) => {
      await this.repository.setStatus(
        establishmentId,
        {
          status: EstablishmentStatus.SUSPENDED,
          suspendedAt: this.clock.now(),
          suspensionReason: reason,
        },
        this.clock.now(),
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.ESTABLISHMENT_SUSPENDED,
          actor,
          target: { type: 'establishment', id: establishmentId },
          establishmentId,
          details: { reason },
          client,
        },
        scope,
      );
    });
  }

  async reactivate(
    actor: AuthenticatedUser,
    establishmentId: string,
    client: ClientDetails,
  ): Promise<void> {
    const status = await this.mustFindStatus(establishmentId);
    if (status !== EstablishmentStatus.SUSPENDED)
      throw new EstablishmentNotSuspendedError();

    await this.unitOfWork.run(async (scope) => {
      await this.repository.setStatus(
        establishmentId,
        {
          status: EstablishmentStatus.ACTIVE,
          suspendedAt: null,
          suspensionReason: null,
        },
        this.clock.now(),
        scope,
      );
      await this.audit.record(
        {
          action: AuditAction.ESTABLISHMENT_REACTIVATED,
          actor,
          target: { type: 'establishment', id: establishmentId },
          establishmentId,
          client,
        },
        scope,
      );
    });
  }

  async setLogo(
    actor: AuthenticatedUser,
    establishmentId: string,
    file: { buffer: Buffer } | undefined,
    client: ClientDetails,
  ): Promise<void> {
    this.assertReachable(actor, establishmentId);
    if (file === undefined || file.buffer.length === 0)
      throw new LogoInvalidError();
    const logo = cleanLogo(file.buffer);
    await this.mustFindStatus(establishmentId);
    await this.unitOfWork.run(async (scope) => {
      await this.repository.setLogo(
        establishmentId,
        logo,
        this.clock.now(),
        scope,
      );
      await this.recordUpdate(actor, establishmentId, ['logo'], client, scope);
    });
  }

  async removeLogo(
    actor: AuthenticatedUser,
    establishmentId: string,
    client: ClientDetails,
  ): Promise<void> {
    this.assertReachable(actor, establishmentId);
    await this.mustFindStatus(establishmentId);
    await this.unitOfWork.run(async (scope) => {
      await this.repository.setLogo(
        establishmentId,
        null,
        this.clock.now(),
        scope,
      );
      await this.recordUpdate(actor, establishmentId, ['logo'], client, scope);
    });
  }

  async logo(
    actor: AuthenticatedUser,
    establishmentId: string,
  ): Promise<CleanLogo> {
    this.assertReachable(actor, establishmentId);
    const logo = await this.repository.findLogo(establishmentId);
    if (logo === undefined) throw new LogoNotFoundError();
    return logo;
  }

  /** A responsable reaches their own establishment; any other reads as absent. */
  private assertReachable(
    actor: AuthenticatedUser,
    establishmentId: string,
  ): void {
    if (
      actor.role !== UserRole.SUPER_ADMIN &&
      actor.establishmentId !== establishmentId
    ) {
      throw new EstablishmentNotFoundError(establishmentId);
    }
  }

  private async mustFind(
    establishmentId: string,
  ): Promise<EstablishmentDetail> {
    const detail = await this.repository.findDetail(establishmentId);
    if (detail === undefined)
      throw new EstablishmentNotFoundError(establishmentId);
    return detail;
  }

  private async mustFindStatus(
    establishmentId: string,
  ): Promise<EstablishmentStatus> {
    const status = await this.repository.findStatus(establishmentId);
    if (status === undefined)
      throw new EstablishmentNotFoundError(establishmentId);
    return status;
  }

  private recordUpdate(
    actor: AuthenticatedUser,
    establishmentId: string,
    fields: string[],
    client: ClientDetails,
    scope: Parameters<AuditService['record']>[1],
  ): Promise<void> {
    return this.audit.record(
      {
        action: AuditAction.ESTABLISHMENT_UPDATED,
        actor,
        target: { type: 'establishment', id: establishmentId },
        establishmentId,
        // The names of the fields, never their values.
        details: { fields },
        client,
      },
      scope,
    );
  }
}

function addInterval(
  from: Date,
  interval: BillingInterval,
  count: number,
): Date {
  const end = new Date(from);
  if (interval === BillingInterval.YEAR)
    end.setUTCFullYear(end.getUTCFullYear() + count);
  else end.setUTCMonth(end.getUTCMonth() + count);
  return end;
}
