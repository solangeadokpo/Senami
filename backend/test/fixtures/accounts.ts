import { BillingInterval } from '@shared/enums/billing-interval.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { createHash, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '@core/database/index.js';
import {
  authSessions,
  establishments,
  subscriptionPlanPrices,
  subscriptionPlans,
  subscriptions,
  users,
} from '@database/schema/index.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';

export const PASSWORD = 'Correct-Horse-Battery-42';

const hasher = new PasswordHasherService();
let passwordHash: Promise<string> | undefined;

export async function createEstablishment(
  db: Database,
  subscriptionStatus: SubscriptionStatus = SubscriptionStatus.ACTIVE,
): Promise<string> {
  const [establishment] = await db
    .insert(establishments)
    .values({
      name: 'École e2e',
      type: EstablishmentType.PRIMAIRE,
      addressLine: '1 rue de la Paix',
      postalCode: '59000',
      city: 'Lille',
    })
    .returning({ id: establishments.id });
  const [plan] = await db
    .insert(subscriptionPlans)
    .values({
      code: `e2e-${randomUUID()}`,
      name: 'Annuel',
      billingInterval: BillingInterval.YEAR,
    })
    .returning({ id: subscriptionPlans.id });
  if (establishment === undefined || plan === undefined) {
    throw new Error('fixtures not created');
  }
  const [price] = await db
    .insert(subscriptionPlanPrices)
    .values({
      planId: plan.id,
      amountCents: 9900,
      validFrom: new Date('2026-01-01'),
    })
    .returning({ id: subscriptionPlanPrices.id });
  if (price === undefined) throw new Error('price not created');

  await db.insert(subscriptions).values({
    establishmentId: establishment.id,
    planId: plan.id,
    planPriceId: price.id,
    status: subscriptionStatus,
    ...(subscriptionStatus === SubscriptionStatus.SUSPENDED
      ? { suspendedAt: new Date() }
      : {}),
  });
  return establishment.id;
}

export async function createUser(
  db: Database,
  options: {
    establishmentId: string | null;
    role?: UserRole;
  },
): Promise<{ id: string; email: string }> {
  passwordHash ??= hasher.hash(PASSWORD);
  const email = `${randomUUID()}@e2e.test`;
  const [user] = await db
    .insert(users)
    .values({
      establishmentId: options.establishmentId,
      role: options.role ?? UserRole.INTERVENANT,
      email,
      firstName: 'Léa',
      lastName: 'Martin',
      status: UserStatus.ACTIVE,
      passwordHash: await passwordHash,
    })
    .returning({ id: users.id });
  if (user === undefined) throw new Error('user not created');
  return { id: user.id, email };
}

export async function deactivateUser(
  db: Database,
  userId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ status: UserStatus.DEACTIVATED, deactivatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function suspendSubscription(
  db: Database,
  establishmentId: string,
): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: SubscriptionStatus.SUSPENDED, suspendedAt: new Date() })
    .where(eq(subscriptions.establishmentId, establishmentId));
}

/** A back office session without going through the second factor. */
export async function createBackofficeSession(
  db: Database,
  userId: string,
): Promise<string> {
  const cookie = randomUUID();
  await db.insert(authSessions).values({
    userId,
    channel: SessionChannel.BACKOFFICE,
    refreshTokenHash: createHash('sha256').update(cookie).digest(),
    platform: DevicePlatform.WEB,
    expiresAt: new Date(Date.now() + 86_400_000),
  });
  return cookie;
}
