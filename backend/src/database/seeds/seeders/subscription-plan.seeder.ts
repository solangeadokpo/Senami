import { and, eq } from 'drizzle-orm';
import { BillingInterval } from '@shared/enums/billing-interval.enum.js';
import {
  subscriptionPlanPrices,
  subscriptionPlans,
} from '@database/schema/index.js';
import type { SeedContext, Seeder } from '@database/seeds/seed-context.js';

export const YEARLY_PLAN_CODE = 'yearly';
export const YEARLY_PRICE_VALID_FROM = new Date('2026-01-01T00:00:00.000Z');
// Placeholder until the client sets the price.
const YEARLY_PRICE_CENTS = 9_900;

export class SubscriptionPlanSeeder implements Seeder {
  readonly name = 'subscription-plan';

  async run({ db, logger }: SeedContext): Promise<void> {
    await db.transaction(async (tx) => {
      let [plan] = await tx
        .select({ id: subscriptionPlans.id })
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.code, YEARLY_PLAN_CODE))
        .limit(1);

      if (plan === undefined) {
        [plan] = await tx
          .insert(subscriptionPlans)
          .values({
            code: YEARLY_PLAN_CODE,
            name: 'Annuel',
            billingInterval: BillingInterval.YEAR,
            intervalCount: 1,
          })
          .returning({ id: subscriptionPlans.id });
        logger.info({ code: YEARLY_PLAN_CODE }, 'Plan created');
      } else {
        logger.info({ code: YEARLY_PLAN_CODE }, 'Plan already present');
      }
      if (plan === undefined) throw new Error('Plan insert returned no row');

      const [price] = await tx
        .select({ id: subscriptionPlanPrices.id })
        .from(subscriptionPlanPrices)
        .where(
          and(
            eq(subscriptionPlanPrices.planId, plan.id),
            eq(subscriptionPlanPrices.validFrom, YEARLY_PRICE_VALID_FROM),
          ),
        )
        .limit(1);

      if (price !== undefined) {
        logger.info({ code: YEARLY_PLAN_CODE }, 'Plan price already present');
        return;
      }
      await tx.insert(subscriptionPlanPrices).values({
        planId: plan.id,
        amountCents: YEARLY_PRICE_CENTS,
        validFrom: YEARLY_PRICE_VALID_FROM,
      });
      logger.info({ code: YEARLY_PLAN_CODE }, 'Plan price created');
    });
  }
}
