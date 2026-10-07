import { eq } from 'drizzle-orm';
import type { BootstrapSeedEnvironment } from '@config/env.validation.js';
import { users } from '@database/schema/index.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import type { SeedContext, Seeder } from '@database/seeds/seed-context.js';

export class SuperAdminSeeder implements Seeder {
  readonly name = 'super-admin';

  constructor(private readonly environment: BootstrapSeedEnvironment) {}

  async run({ db, logger, passwords }: SeedContext): Promise<void> {
    const email = this.environment.SEED_SUPER_ADMIN_EMAIL;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing !== undefined) {
        if (existing.role !== UserRole.SUPER_ADMIN) {
          logger.warn(
            { userId: existing.id, role: existing.role },
            'Super admin email already used by another account, left untouched',
          );
          return;
        }
        logger.info({ userId: existing.id }, 'Super admin already present');
        return;
      }

      const [created] = await tx
        .insert(users)
        .values({
          establishmentId: null,
          role: UserRole.SUPER_ADMIN,
          email,
          firstName: this.environment.SEED_SUPER_ADMIN_FIRST_NAME,
          lastName: this.environment.SEED_SUPER_ADMIN_LAST_NAME,
          status: UserStatus.ACTIVE,
          passwordHash: await passwords.hash(
            this.environment.SEED_SUPER_ADMIN_PASSWORD,
          ),
        })
        .returning({ id: users.id });
      logger.info({ userId: created?.id }, 'Super admin created');
    });
  }
}
