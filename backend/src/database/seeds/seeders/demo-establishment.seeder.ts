import { and, eq, ne } from 'drizzle-orm';
import type { DemoSeedEnvironment } from '@config/env.validation.js';
import { type Transaction, asSuperAdmin } from '@core/database/index.js';
import {
  establishments,
  sheetRecipients,
  subscriptionPlanPrices,
  subscriptionPlans,
  subscriptions,
  usefulContacts,
  users,
} from '@database/schema/index.js';
import type { SeedContext, Seeder } from '@database/seeds/seed-context.js';
import { ContactCategory } from '@shared/enums/contact-category.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import {
  YEARLY_PLAN_CODE,
  YEARLY_PRICE_VALID_FROM,
} from './subscription-plan.seeder.js';

// Fixed, so that a second run recognises the establishment.
export const DEMO_ESTABLISHMENT_ID = '5e1a7c3d-0b2f-4c6e-9a8d-1f2e3d4c5b6a';
export const DEMO_RESPONSABLE_EMAIL = 'responsable@demo.senami.fr';
export const DEMO_INTERVENANT_EMAIL = 'intervenant@demo.senami.fr';

const DEMO_USERS = [
  {
    email: DEMO_RESPONSABLE_EMAIL,
    role: UserRole.RESPONSABLE,
    firstName: 'Responsable',
    lastName: 'Démo',
  },
  {
    email: DEMO_INTERVENANT_EMAIL,
    role: UserRole.INTERVENANT,
    firstName: 'Intervenant',
    lastName: 'Démo',
  },
];

const DEMO_CONTACTS = [
  { category: ContactCategory.SAMU, label: 'SAMU', phone: '15', sortOrder: 1 },
  {
    category: ContactCategory.EMERGENCY,
    label: 'Urgences',
    phone: '112',
    sortOrder: 2,
  },
  {
    category: ContactCategory.DIRECTION,
    label: 'Direction',
    phone: '01 00 00 00 00',
    sortOrder: 3,
  },
];

const YEAR_MS = 365 * 86_400_000;

/** Needs the yearly plan: run after SubscriptionPlanSeeder. */
export class DemoEstablishmentSeeder implements Seeder {
  readonly name = 'demo-establishment';

  constructor(private readonly environment: DemoSeedEnvironment) {}

  async run(context: SeedContext): Promise<void> {
    // Super admin scope: recipients and contacts are under row level security.
    await asSuperAdmin(context.db, async (tx) => {
      await this.seedEstablishment(tx, context);
      await this.seedSubscription(tx, context);
      await this.seedUsers(tx, context);
      await this.seedRecipient(tx, context);
      await this.seedContacts(tx, context);
    });
  }

  private async seedEstablishment(
    tx: Transaction,
    { logger }: SeedContext,
  ): Promise<void> {
    const [existing] = await tx
      .select({ id: establishments.id })
      .from(establishments)
      .where(eq(establishments.id, DEMO_ESTABLISHMENT_ID))
      .limit(1);
    if (existing !== undefined) {
      logger.info(
        { establishmentId: DEMO_ESTABLISHMENT_ID },
        'Demo establishment already present',
      );
      return;
    }

    await tx.insert(establishments).values({
      id: DEMO_ESTABLISHMENT_ID,
      name: 'École de démonstration Senami',
      type: EstablishmentType.PRIMAIRE,
      addressLine: '1 rue de la Démonstration',
      postalCode: '75001',
      city: 'Paris',
      email: 'contact@demo.senami.fr',
      status: EstablishmentStatus.ACTIVE,
      isDemo: true,
    });
    logger.info(
      { establishmentId: DEMO_ESTABLISHMENT_ID },
      'Demo establishment created',
    );
  }

  private async seedSubscription(
    tx: Transaction,
    { logger, clock }: SeedContext,
  ): Promise<void> {
    const [existing] = await tx
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.establishmentId, DEMO_ESTABLISHMENT_ID),
          ne(subscriptions.status, SubscriptionStatus.CANCELLED),
        ),
      )
      .limit(1);
    if (existing !== undefined) {
      logger.info(
        { establishmentId: DEMO_ESTABLISHMENT_ID },
        'Demo subscription already present',
      );
      return;
    }

    const [price] = await tx
      .select({
        planId: subscriptionPlans.id,
        priceId: subscriptionPlanPrices.id,
      })
      .from(subscriptionPlanPrices)
      .innerJoin(
        subscriptionPlans,
        eq(subscriptionPlans.id, subscriptionPlanPrices.planId),
      )
      .where(
        and(
          eq(subscriptionPlans.code, YEARLY_PLAN_CODE),
          eq(subscriptionPlanPrices.validFrom, YEARLY_PRICE_VALID_FROM),
        ),
      )
      .limit(1);
    if (price === undefined) {
      throw new Error(
        `Plan ${YEARLY_PLAN_CODE} missing: run the subscription plan seeder first`,
      );
    }

    const now = clock.now();
    await tx.insert(subscriptions).values({
      establishmentId: DEMO_ESTABLISHMENT_ID,
      planId: price.planId,
      planPriceId: price.priceId,
      status: SubscriptionStatus.ACTIVE,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + YEAR_MS),
    });
    logger.info(
      { establishmentId: DEMO_ESTABLISHMENT_ID },
      'Demo subscription created',
    );
  }

  private async seedUsers(
    tx: Transaction,
    { logger, passwords }: SeedContext,
  ): Promise<void> {
    let passwordHash: string | undefined;

    for (const user of DEMO_USERS) {
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);
      if (existing !== undefined) {
        logger.info(
          { userId: existing.id, role: user.role },
          'Demo user already present',
        );
        continue;
      }

      passwordHash ??= await passwords.hash(
        this.environment.SEED_DEMO_PASSWORD,
      );
      const [created] = await tx
        .insert(users)
        .values({
          ...user,
          establishmentId: DEMO_ESTABLISHMENT_ID,
          status: UserStatus.ACTIVE,
          passwordHash,
        })
        .returning({ id: users.id });
      logger.info(
        { userId: created?.id, role: user.role },
        'Demo user created',
      );
    }
  }

  private async seedRecipient(
    tx: Transaction,
    { logger }: SeedContext,
  ): Promise<void> {
    const [existing] = await tx
      .select({ establishmentId: sheetRecipients.establishmentId })
      .from(sheetRecipients)
      .where(eq(sheetRecipients.establishmentId, DEMO_ESTABLISHMENT_ID));
    if (existing !== undefined) {
      logger.info(
        { establishmentId: DEMO_ESTABLISHMENT_ID },
        'Demo sheet recipient already present',
      );
      return;
    }

    await tx.insert(sheetRecipients).values({
      establishmentId: DEMO_ESTABLISHMENT_ID,
      toEmails: [DEMO_RESPONSABLE_EMAIL],
    });
    logger.info(
      { establishmentId: DEMO_ESTABLISHMENT_ID },
      'Demo sheet recipient created',
    );
  }

  private async seedContacts(
    tx: Transaction,
    { logger }: SeedContext,
  ): Promise<void> {
    const present = await tx
      .select({ label: usefulContacts.label })
      .from(usefulContacts)
      .where(eq(usefulContacts.establishmentId, DEMO_ESTABLISHMENT_ID));
    const labels = new Set(present.map((contact) => contact.label));
    const missing = DEMO_CONTACTS.filter(
      (contact) => !labels.has(contact.label),
    );

    if (missing.length > 0) {
      await tx.insert(usefulContacts).values(
        missing.map((contact) => ({
          ...contact,
          establishmentId: DEMO_ESTABLISHMENT_ID,
        })),
      );
    }
    logger.info(
      { establishmentId: DEMO_ESTABLISHMENT_ID, created: missing.length },
      'Demo useful contacts seeded',
    );
  }
}
