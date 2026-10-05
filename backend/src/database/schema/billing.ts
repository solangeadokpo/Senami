import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, timestamptz, updatedAt } from './columns.js';
import { paymentStatus, subscriptionStatus } from './enums.js';
import { establishments } from './establishments.js';
import { tenantIsolation } from './policies.js';

/** A plan is a duration: billing_interval x interval_count (3 x month). */
export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: id(),
    code: text().notNull().unique(),
    name: text().notNull(),
    billingInterval: text().notNull(),
    intervalCount: smallint().notNull().default(1),
    // false: no longer offered to new subscriptions.
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  () => [
    check(
      'subscription_plans_billing_interval_check',
      sql`billing_interval IN ('month', 'year')`,
    ),
    check('subscription_plans_interval_count_check', sql`interval_count > 0`),
  ],
);

/**
 * Versioned prices: a price change is a new row, never an update. The price in
 * force is the latest `valid_from` not in the future.
 */
export const subscriptionPlanPrices = pgTable(
  'subscription_plan_prices',
  {
    id: id(),
    planId: uuid()
      .notNull()
      .references(() => subscriptionPlans.id),
    amountCents: integer().notNull(),
    currency: char({ length: 3 }).notNull().default('EUR'),
    validFrom: timestamptz().notNull(),
    // Price id at the payment provider (Stripe `price_...`).
    providerPriceId: text().unique(),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.planId, t.validFrom),
    // Target of the composite foreign key from subscriptions.
    unique().on(t.id, t.planId),
    check('subscription_plan_prices_amount_check', sql`amount_cents > 0`),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    establishmentId: uuid()
      .notNull()
      .references(() => establishments.id),
    planId: uuid()
      .notNull()
      .references(() => subscriptionPlans.id),
    // Price applied to this subscription.
    planPriceId: uuid().notNull(),
    status: subscriptionStatus().notNull(),
    startedAt: timestamptz(),
    currentPeriodStart: timestamptz(),
    // Due date (ETB-07, SA-03).
    currentPeriodEnd: timestamptz(),
    cancelAtPeriodEnd: boolean().notNull().default(false),
    paymentProvider: text(),
    providerCustomerId: text(),
    providerSubscriptionId: text(),
    // PAY-05 reminders.
    dunningAttempts: smallint().notNull().default(0),
    lastDunningAt: timestamptz(),
    suspendedAt: timestamptz(),
    suspensionReason: text(),
    cancelledAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique().on(t.id, t.establishmentId),
    unique().on(t.paymentProvider, t.providerSubscriptionId),
    foreignKey({
      name: 'subscriptions_plan_price_fk',
      columns: [t.planPriceId, t.planId],
      foreignColumns: [
        subscriptionPlanPrices.id,
        subscriptionPlanPrices.planId,
      ],
    }),
    // One subscription in force per establishment.
    uniqueIndex('subscriptions_one_current_uq')
      .on(t.establishmentId)
      .where(sql`status <> 'cancelled'`),
    index('subscriptions_period_end_idx')
      .on(t.currentPeriodEnd)
      .where(sql`status <> 'cancelled'`),
    check(
      'subscriptions_suspension_reason_check',
      sql`suspension_reason IN ('payment_failed', 'manual')`,
    ),
    check(
      'subscriptions_suspended_check',
      sql`status <> 'suspended' OR suspended_at IS NOT NULL`,
    ),
    check(
      'subscriptions_cancelled_check',
      sql`status <> 'cancelled' OR cancelled_at IS NOT NULL`,
    ),
  ],
);

/** PAY-03, PAY-06: payment history, no card data. */
export const payments = pgTable(
  'payments',
  {
    id: id(),
    subscriptionId: uuid().notNull(),
    establishmentId: uuid().notNull(),
    paymentProvider: text().notNull(),
    providerPaymentId: text().notNull(),
    amountCents: integer().notNull(),
    currency: char({ length: 3 }).notNull().default('EUR'),
    status: paymentStatus().notNull(),
    periodStart: timestamptz(),
    periodEnd: timestamptz(),
    paidAt: timestamptz(),
    failedAt: timestamptz(),
    failureReason: text(),
    refundedAt: timestamptz(),
    refundedAmountCents: integer(),
    receiptNumber: text().unique(),
    // Receipt hosted by the payment provider.
    receiptUrl: text(),
    receiptSentAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    tenantIsolation(),
    foreignKey({
      name: 'payments_subscription_fk',
      columns: [t.subscriptionId, t.establishmentId],
      foreignColumns: [subscriptions.id, subscriptions.establishmentId],
    }),
    unique().on(t.paymentProvider, t.providerPaymentId),
    index('payments_establishment_idx').on(
      t.establishmentId,
      t.createdAt.desc(),
    ),
    check('payments_amount_check', sql`amount_cents >= 0`),
    check('payments_refunded_amount_check', sql`refunded_amount_cents >= 0`),
    check(
      'payments_succeeded_check',
      sql`status <> 'succeeded' OR paid_at IS NOT NULL`,
    ),
  ],
);

/** PAY-04: provider notifications, processed exactly once. */
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: id(),
    paymentProvider: text().notNull(),
    providerEventId: text().notNull(),
    eventType: text().notNull(),
    payload: jsonb().notNull(),
    receivedAt: timestamptz().notNull().defaultNow(),
    processedAt: timestamptz(),
    processingError: text(),
  },
  (t) => [
    unique().on(t.paymentProvider, t.providerEventId),
    index('payment_webhook_events_unprocessed_idx')
      .on(t.receivedAt)
      .where(sql`processed_at IS NULL`),
  ],
);
