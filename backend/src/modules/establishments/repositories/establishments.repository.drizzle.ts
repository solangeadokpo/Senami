import { Inject, Injectable } from '@nestjs/common';
import {
  type SQL,
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import {
  DRIZZLE,
  type Database,
  asSuperAdmin,
  executorOf,
} from '@core/database/index.js';
import {
  declarationSubmissions,
  establishments,
  subscriptionPlanPrices,
  subscriptionPlans,
  subscriptions,
  users,
} from '@database/schema/index.js';
import {
  type CleanLogo,
  isLogoMimeType,
} from '@modules/establishments/utils/logo-file.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { TransactionScope } from '@shared/interfaces/unit-of-work.interface.js';
import type {
  CurrentPrice,
  EstablishmentBase,
  EstablishmentDetail,
  EstablishmentFields,
  EstablishmentFilters,
  EstablishmentRelations,
  EstablishmentSummary,
  EstablishmentsRepository,
  NewEstablishment,
  ResponsableSummary,
  SubscriptionSummary,
} from './establishments.repository.js';

// Accents and case ignored by the search, without the unaccent extension.
const ACCENTED = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿœæ';
const PLAIN = 'aaaaaaceeeeiiiinooooouuuuyyoa';
const fold = (column: SQL | typeof establishments.name) =>
  sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN})`;
const foldText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('œ', 'o')
    .replaceAll('æ', 'a');
const likeEscape = (value: string) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// declaration_submissions is under row level security: counted as super admin.
const MONTH_START = sql`date_trunc('month', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris'`;

const summaryColumns = {
  id: establishments.id,
  name: establishments.name,
  type: establishments.type,
  city: establishments.city,
  status: establishments.status,
  isDemo: establishments.isDemo,
  createdAt: establishments.createdAt,
};

@Injectable()
export class DrizzleEstablishmentsRepository implements EstablishmentsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(
    filters: EstablishmentFilters,
  ): Promise<{ items: EstablishmentSummary[]; total: number }> {
    const where = this.whereOf(filters);
    const [totalRow] = await this.db
      .select({ total: count() })
      .from(establishments)
      .where(where);
    const rows = await this.db
      .select(summaryColumns)
      .from(establishments)
      .where(where)
      .orderBy(asc(establishments.name), asc(establishments.id))
      .limit(filters.limit)
      .offset(filters.offset);
    return {
      items: await this.withRelations(rows),
      total: totalRow?.total ?? 0,
    };
  }

  async cities(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ city: establishments.city })
      .from(establishments)
      .orderBy(asc(establishments.city));
    return rows.map((row) => row.city);
  }

  async findDetail(
    establishmentId: string,
  ): Promise<EstablishmentDetail | undefined> {
    const [row] = await this.db
      .select({
        ...summaryColumns,
        addressLine: establishments.addressLine,
        postalCode: establishments.postalCode,
        phone: establishments.phone,
        email: establishments.email,
        approxStudentCount: establishments.approxStudentCount,
        hasLogo: isNotNull(establishments.logo).mapWith(Boolean),
        suspendedAt: establishments.suspendedAt,
        suspensionReason: establishments.suspensionReason,
      })
      .from(establishments)
      .where(eq(establishments.id, establishmentId))
      .limit(1);
    if (row === undefined) return undefined;

    const [withRelations] = await this.withRelations([row]);
    if (withRelations === undefined) return undefined;
    const userCounts = await this.db
      .select({ role: users.role, status: users.status, count: count() })
      .from(users)
      .where(eq(users.establishmentId, establishmentId))
      .groupBy(users.role, users.status);
    return { ...row, ...withRelations, users: userCounts };
  }

  async findStatus(
    establishmentId: string,
  ): Promise<EstablishmentStatus | undefined> {
    const [row] = await this.db
      .select({ status: establishments.status })
      .from(establishments)
      .where(eq(establishments.id, establishmentId))
      .limit(1);
    return row?.status;
  }

  async isEmailUsed(email: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return row !== undefined;
  }

  async findCurrentPrice(at: Date): Promise<CurrentPrice | undefined> {
    const [row] = await this.db
      .select({
        planId: subscriptionPlans.id,
        priceId: subscriptionPlanPrices.id,
        billingInterval: subscriptionPlans.billingInterval,
        intervalCount: subscriptionPlans.intervalCount,
      })
      .from(subscriptionPlanPrices)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptionPlans.id, subscriptionPlanPrices.planId),
      )
      .where(
        and(
          eq(subscriptionPlans.isActive, true),
          lte(subscriptionPlanPrices.validFrom, at),
        ),
      )
      .orderBy(
        asc(subscriptionPlans.createdAt),
        desc(subscriptionPlanPrices.validFrom),
      )
      .limit(1);
    return row;
  }

  async create(
    input: NewEstablishment,
    scope: TransactionScope,
  ): Promise<{ establishmentId: string; responsableId: string }> {
    const executor = executorOf(this.db, scope);
    const [establishment] = await executor
      .insert(establishments)
      .values({ ...input.establishment, status: EstablishmentStatus.ACTIVE })
      .returning({ id: establishments.id });
    if (establishment === undefined)
      throw new Error('Establishment not created');

    await executor.insert(subscriptions).values({
      establishmentId: establishment.id,
      planId: input.subscription.planId,
      planPriceId: input.subscription.priceId,
      status: SubscriptionStatus.ACTIVE,
      startedAt: input.subscription.startsAt,
      currentPeriodStart: input.subscription.startsAt,
      currentPeriodEnd: input.subscription.endsAt,
    });

    const [responsable] = await executor
      .insert(users)
      .values({
        establishmentId: establishment.id,
        role: UserRole.RESPONSABLE,
        status: UserStatus.INVITED,
        createdBy: input.createdBy,
        ...input.responsable,
      })
      .returning({ id: users.id });
    if (responsable === undefined) throw new Error('Responsable not created');
    return { establishmentId: establishment.id, responsableId: responsable.id };
  }

  async update(
    establishmentId: string,
    changes: Partial<EstablishmentFields>,
    at: Date,
    scope?: TransactionScope,
  ): Promise<void> {
    await executorOf(this.db, scope)
      .update(establishments)
      .set({ ...changes, updatedAt: at })
      .where(eq(establishments.id, establishmentId));
  }

  async setStatus(
    establishmentId: string,
    status: {
      status: EstablishmentStatus;
      suspendedAt: Date | null;
      suspensionReason: string | null;
    },
    at: Date,
    scope?: TransactionScope,
  ): Promise<void> {
    await executorOf(this.db, scope)
      .update(establishments)
      .set({ ...status, updatedAt: at })
      .where(eq(establishments.id, establishmentId));
  }

  async setLogo(
    establishmentId: string,
    logo: CleanLogo | null,
    at: Date,
    scope?: TransactionScope,
  ): Promise<void> {
    await executorOf(this.db, scope)
      .update(establishments)
      .set({
        logo: logo?.content ?? null,
        logoMimeType: logo?.mimeType ?? null,
        updatedAt: at,
      })
      .where(eq(establishments.id, establishmentId));
  }

  async findLogo(establishmentId: string): Promise<CleanLogo | undefined> {
    const [row] = await this.db
      .select({
        content: establishments.logo,
        mimeType: establishments.logoMimeType,
      })
      .from(establishments)
      .where(eq(establishments.id, establishmentId))
      .limit(1);
    if (
      row?.content == null ||
      row.mimeType === null ||
      !isLogoMimeType(row.mimeType)
    ) {
      return undefined;
    }
    return { content: row.content, mimeType: row.mimeType };
  }

  private whereOf(filters: EstablishmentFilters): SQL | undefined {
    const search =
      filters.search === undefined || filters.search === ''
        ? undefined
        : `%${likeEscape(foldText(filters.search))}%`;
    return and(
      search === undefined
        ? undefined
        : or(
            sql`${fold(establishments.name)} LIKE ${search}`,
            exists(
              this.db
                .select({ one: sql`1` })
                .from(users)
                .where(
                  and(
                    eq(users.establishmentId, establishments.id),
                    eq(users.role, UserRole.RESPONSABLE),
                    sql`${fold(sql`${users.email}::text`)} LIKE ${search}`,
                  ),
                ),
            ),
          ),
      filters.city === undefined
        ? undefined
        : eq(establishments.city, filters.city),
      filters.status === undefined
        ? undefined
        : eq(establishments.status, filters.status),
    );
  }

  /** Responsable, subscription and counter of a page, in three queries. */
  private async withRelations<T extends EstablishmentBase>(
    rows: T[],
  ): Promise<(T & EstablishmentRelations)[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);

    const responsables = await this.db
      .select({
        establishmentId: users.establishmentId,
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        status: users.status,
        isSecondFactorEnrolled: isNotNull(users.totpEnrolledAt).mapWith(
          Boolean,
        ),
      })
      .from(users)
      .where(
        and(
          inArray(users.establishmentId, ids),
          eq(users.role, UserRole.RESPONSABLE),
        ),
      )
      .orderBy(asc(users.createdAt));
    const subscriptionRows = await this.db
      .select({
        establishmentId: subscriptions.establishmentId,
        status: subscriptions.status,
        planName: subscriptionPlans.name,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
      })
      .from(subscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptionPlans.id, subscriptions.planId),
      )
      .where(inArray(subscriptions.establishmentId, ids))
      .orderBy(desc(subscriptions.createdAt));
    const counts = await asSuperAdmin(this.db, (tx) =>
      tx
        .select({
          establishmentId: declarationSubmissions.establishmentId,
          count: count(),
        })
        .from(declarationSubmissions)
        .where(
          and(
            inArray(declarationSubmissions.establishmentId, ids),
            gte(declarationSubmissions.receivedAt, MONTH_START),
          ),
        )
        .groupBy(declarationSubmissions.establishmentId),
    );

    return rows.map((row) => ({
      ...row,
      responsable: toResponsable(
        responsables.find((item) => item.establishmentId === row.id),
      ),
      subscription: toSubscription(
        subscriptionRows.find((item) => item.establishmentId === row.id),
      ),
      declarationsThisMonth:
        counts.find((item) => item.establishmentId === row.id)?.count ?? 0,
    }));
  }
}

function toResponsable(
  row: (ResponsableSummary & { establishmentId: string | null }) | undefined,
): ResponsableSummary | null {
  if (row === undefined) return null;
  const { establishmentId: _establishmentId, ...responsable } = row;
  return responsable;
}

function toSubscription(
  row: (SubscriptionSummary & { establishmentId: string }) | undefined,
): SubscriptionSummary | null {
  if (row === undefined) return null;
  const { establishmentId: _establishmentId, ...subscription } = row;
  return subscription;
}
