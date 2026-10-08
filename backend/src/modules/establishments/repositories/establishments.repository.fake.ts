import { randomUUID } from 'node:crypto';
import type { CleanLogo } from '@modules/establishments/utils/logo-file.js';
import { BillingInterval } from '@shared/enums/billing-interval.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type {
  CurrentPrice,
  EstablishmentDetail,
  EstablishmentFields,
  EstablishmentFilters,
  EstablishmentSummary,
  EstablishmentsRepository,
  NewEstablishment,
} from './establishments.repository.js';

interface FakeEstablishment {
  detail: EstablishmentDetail;
  logo: CleanLogo | null;
}

export class FakeEstablishmentsRepository implements EstablishmentsRepository {
  readonly establishments = new Map<string, FakeEstablishment>();
  readonly usedEmails = new Set<string>();
  currentPrice: CurrentPrice | undefined = {
    planId: randomUUID(),
    priceId: randomUUID(),
    billingInterval: BillingInterval.YEAR,
    intervalCount: 1,
  };
  readonly created: NewEstablishment[] = [];

  list(
    filters: EstablishmentFilters,
  ): Promise<{ items: EstablishmentSummary[]; total: number }> {
    const matching = [...this.establishments.values()]
      .map(({ detail }) => detail)
      .filter(
        (detail) =>
          (filters.search === undefined ||
            detail.name.toLowerCase().includes(filters.search.toLowerCase())) &&
          (filters.city === undefined || detail.city === filters.city) &&
          (filters.status === undefined || detail.status === filters.status),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return Promise.resolve({
      items: matching.slice(filters.offset, filters.offset + filters.limit),
      total: matching.length,
    });
  }

  cities(): Promise<string[]> {
    return Promise.resolve(
      [
        ...new Set(
          [...this.establishments.values()].map(({ detail }) => detail.city),
        ),
      ].sort(),
    );
  }

  findDetail(
    establishmentId: string,
  ): Promise<EstablishmentDetail | undefined> {
    const found = this.establishments.get(establishmentId);
    return Promise.resolve(
      found === undefined ? undefined : structuredClone(found.detail),
    );
  }

  findStatus(
    establishmentId: string,
  ): Promise<EstablishmentStatus | undefined> {
    return Promise.resolve(
      this.establishments.get(establishmentId)?.detail.status,
    );
  }

  isEmailUsed(email: string): Promise<boolean> {
    return Promise.resolve(this.usedEmails.has(email.toLowerCase()));
  }

  findCurrentPrice(): Promise<CurrentPrice | undefined> {
    return Promise.resolve(this.currentPrice);
  }

  create(
    input: NewEstablishment,
  ): Promise<{ establishmentId: string; responsableId: string }> {
    const establishmentId = randomUUID();
    const responsableId = randomUUID();
    this.created.push(input);
    this.usedEmails.add(input.responsable.email.toLowerCase());
    this.establishments.set(establishmentId, {
      logo: null,
      detail: {
        id: establishmentId,
        ...input.establishment,
        status: EstablishmentStatus.ACTIVE,
        isDemo: false,
        createdAt: input.subscription.startsAt,
        responsable: {
          userId: responsableId,
          ...input.responsable,
          status: UserStatus.INVITED,
          isSecondFactorEnrolled: false,
        },
        subscription: {
          status: SubscriptionStatus.ACTIVE,
          planName: 'Annuel',
          currentPeriodEnd: input.subscription.endsAt,
        },
        declarationsThisMonth: 0,
        hasLogo: false,
        suspendedAt: null,
        suspensionReason: null,
        users: [],
      },
    });
    return Promise.resolve({ establishmentId, responsableId });
  }

  update(
    establishmentId: string,
    changes: Partial<EstablishmentFields>,
  ): Promise<void> {
    Object.assign(this.mustGet(establishmentId).detail, changes);
    return Promise.resolve();
  }

  setStatus(
    establishmentId: string,
    status: {
      status: EstablishmentStatus;
      suspendedAt: Date | null;
      suspensionReason: string | null;
    },
  ): Promise<void> {
    Object.assign(this.mustGet(establishmentId).detail, status);
    return Promise.resolve();
  }

  setLogo(establishmentId: string, logo: CleanLogo | null): Promise<void> {
    const found = this.mustGet(establishmentId);
    found.logo = logo;
    found.detail.hasLogo = logo !== null;
    return Promise.resolve();
  }

  findLogo(establishmentId: string): Promise<CleanLogo | undefined> {
    return Promise.resolve(
      this.establishments.get(establishmentId)?.logo ?? undefined,
    );
  }

  private mustGet(establishmentId: string): FakeEstablishment {
    const found = this.establishments.get(establishmentId);
    if (found === undefined)
      throw new Error(`unknown establishment ${establishmentId}`);
    return found;
  }
}
