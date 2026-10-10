import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { and, count, eq, inArray, ne } from 'drizzle-orm';
import { pino } from 'pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DRIZZLE, type Database, asSuperAdmin } from '@core/database/index.js';
import { SystemClock } from '@core/time/system-clock.js';
import {
  establishments,
  sheetRecipients,
  subscriptionPlans,
  subscriptions,
  usefulContacts,
  users,
} from '@database/schema/index.js';
import type { SeedContext } from '@database/seeds/seed-context.js';
import { SeedLevel } from '@database/seeds/seed-level.enum.js';
import { runSeeders, seedersFor } from '@database/seeds/seed-runner.js';
import {
  DEMO_ESTABLISHMENT_ID,
  DEMO_INTERVENANT_EMAIL,
  DEMO_RESPONSABLE_EMAIL,
} from '@database/seeds/seeders/demo-establishment.seeder.js';
import { YEARLY_PLAN_CODE } from '@database/seeds/seeders/subscription-plan.seeder.js';
import { PasswordHasherService } from '@modules/auth/services/password-hasher.service.js';
import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { createTestApp } from './app.js';

const SUPER_ADMIN_PASSWORD = 'super-admin-password-e2e';
const DEMO_PASSWORD = 'demo-password-for-e2e';

describe('seeders', () => {
  let app: INestApplication<App>;
  let db: Database;
  let context: SeedContext;
  const superAdminEmail = `${randomUUID()}@e2e.test`;
  const environment = {
    DATABASE_URL: 'postgres://unused-by-the-seeders',
    SEED_SUPER_ADMIN_EMAIL: superAdminEmail,
    SEED_SUPER_ADMIN_PASSWORD: SUPER_ADMIN_PASSWORD,
    SEED_DEMO_PASSWORD: DEMO_PASSWORD,
  };

  beforeAll(async () => {
    app = await createTestApp();
    db = app.get<Database>(DRIZZLE);
    context = {
      db,
      logger: pino({ level: 'silent' }),
      clock: new SystemClock(),
      passwords: new PasswordHasherService(),
    };
    await runSeeders(seedersFor(SeedLevel.ALL, environment), context);
  });

  afterAll(async () => {
    await app.close();
  });

  async function snapshot() {
    const [superAdmin] = await db
      .select({
        role: users.role,
        establishmentId: users.establishmentId,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, superAdminEmail));
    const [plans] = await db
      .select({ value: count() })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.code, YEARLY_PLAN_CODE));
    const [demoUsers] = await db
      .select({ value: count() })
      .from(users)
      .where(
        inArray(users.email, [DEMO_RESPONSABLE_EMAIL, DEMO_INTERVENANT_EMAIL]),
      );
    const [currentSubscriptions] = await db
      .select({ value: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.establishmentId, DEMO_ESTABLISHMENT_ID),
          ne(subscriptions.status, SubscriptionStatus.CANCELLED),
        ),
      );
    const tenantRows = await asSuperAdmin(db, async (tx) => ({
      recipients: await tx
        .select({ to: sheetRecipients.toEmails })
        .from(sheetRecipients)
        .where(eq(sheetRecipients.establishmentId, DEMO_ESTABLISHMENT_ID)),
      contacts: await tx
        .select({ label: usefulContacts.label })
        .from(usefulContacts)
        .where(eq(usefulContacts.establishmentId, DEMO_ESTABLISHMENT_ID)),
    }));
    return {
      superAdmin,
      plans: plans?.value,
      demoUsers: demoUsers?.value,
      currentSubscriptions: currentSubscriptions?.value,
      ...tenantRows,
    };
  }

  function signIn(email: string, password: string) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/mobile/login')
      .send({
        email,
        password,
        device: {
          id: randomUUID(),
          platform: DevicePlatform.IOS,
          appVersion: '1.0.0',
        },
      });
  }

  it('creates the super admin, the plan and the demo establishment with its users', async () => {
    const [establishment] = await db
      .select({ isDemo: establishments.isDemo })
      .from(establishments)
      .where(eq(establishments.id, DEMO_ESTABLISHMENT_ID));

    expect(establishment).toEqual({ isDemo: true });
    expect(await snapshot()).toMatchObject({
      superAdmin: { role: UserRole.SUPER_ADMIN, establishmentId: null },
      plans: 1,
      demoUsers: 2,
      currentSubscriptions: 1,
      recipients: [{ to: [DEMO_RESPONSABLE_EMAIL] }],
    });
    expect((await snapshot()).contacts.map((c) => c.label).sort()).toEqual([
      'Direction',
      'SAMU',
      'Urgences',
    ]);
  });

  it('creates nothing more and changes no password on a second run', async () => {
    const before = await snapshot();

    await runSeeders(seedersFor(SeedLevel.ALL, environment), context);

    expect(await snapshot()).toEqual(before);
  });

  it('lets the demo responsable and intervenant sign in on the mobile app', async () => {
    await signIn(DEMO_RESPONSABLE_EMAIL, DEMO_PASSWORD).expect(200);
    await signIn(DEMO_INTERVENANT_EMAIL, DEMO_PASSWORD).expect(200);
  });

  it('keeps the super admin out of the mobile app', async () => {
    const response = await signIn(superAdminEmail, SUPER_ADMIN_PASSWORD).expect(
      403,
    );

    expect(response.body).toMatchObject({
      error: { code: 'CHANNEL_NOT_ALLOWED' },
    });
  });
});
