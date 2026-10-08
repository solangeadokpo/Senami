import type { BillingInterval } from '@shared/enums/billing-interval.enum.js';
import type { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import type { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import type { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import type { UserRole } from '@shared/enums/user-role.enum.js';
import type { UserStatus } from '@shared/enums/user-status.enum.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type { CleanLogo } from '@modules/establishments/utils/logo-file.js';

/** What the creation and the update write; printed on the sheet. */
export interface EstablishmentFields {
  name: string;
  type: EstablishmentType;
  addressLine: string;
  postalCode: string;
  city: string;
  phone: string | null;
  email: string | null;
  approxStudentCount: number | null;
}

export interface ResponsableSummary {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  isSecondFactorEnrolled: boolean;
}

export interface SubscriptionSummary {
  status: SubscriptionStatus;
  planName: string;
  currentPeriodEnd: Date | null;
}

export interface EstablishmentBase {
  id: string;
  name: string;
  type: EstablishmentType;
  city: string;
  status: EstablishmentStatus;
  isDemo: boolean;
  createdAt: Date;
}

export interface EstablishmentRelations {
  /** The first responsable created, the one invited at the creation. */
  responsable: ResponsableSummary | null;
  subscription: SubscriptionSummary | null;
  /** Received since the first day of the month, France time. A counter. */
  declarationsThisMonth: number;
}

export interface EstablishmentSummary
  extends EstablishmentBase, EstablishmentRelations {}

export interface EstablishmentDetail
  extends EstablishmentSummary, EstablishmentFields {
  hasLogo: boolean;
  suspendedAt: Date | null;
  suspensionReason: string | null;
  users: { role: UserRole; status: UserStatus; count: number }[];
}

export interface EstablishmentFilters {
  search?: string;
  city?: string;
  status?: EstablishmentStatus;
  offset: number;
  limit: number;
}

export interface CurrentPrice {
  planId: string;
  priceId: string;
  billingInterval: BillingInterval;
  intervalCount: number;
}

export interface NewEstablishment {
  establishment: EstablishmentFields;
  responsable: { firstName: string; lastName: string; email: string };
  subscription: CurrentPrice & { startsAt: Date; endsAt: Date };
  createdBy: string;
}

export interface EstablishmentsRepository {
  list(
    filters: EstablishmentFilters,
  ): Promise<{ items: EstablishmentSummary[]; total: number }>;
  cities(): Promise<string[]>;
  findDetail(establishmentId: string): Promise<EstablishmentDetail | undefined>;
  findStatus(establishmentId: string): Promise<EstablishmentStatus | undefined>;
  isEmailUsed(email: string): Promise<boolean>;
  /** The price in force of the single plan offered to new subscriptions. */
  findCurrentPrice(at: Date): Promise<CurrentPrice | undefined>;
  create(
    input: NewEstablishment,
    scope: TransactionScope,
  ): Promise<{ establishmentId: string; responsableId: string }>;
  update(
    establishmentId: string,
    changes: Partial<EstablishmentFields>,
    at: Date,
    scope?: TransactionScope,
  ): Promise<void>;
  setStatus(
    establishmentId: string,
    status: {
      status: EstablishmentStatus;
      suspendedAt: Date | null;
      suspensionReason: string | null;
    },
    at: Date,
    scope?: TransactionScope,
  ): Promise<void>;
  setLogo(
    establishmentId: string,
    logo: CleanLogo | null,
    at: Date,
    scope?: TransactionScope,
  ): Promise<void>;
  findLogo(establishmentId: string): Promise<CleanLogo | undefined>;
}

export const ESTABLISHMENTS_REPOSITORY = Symbol('ESTABLISHMENTS_REPOSITORY');
