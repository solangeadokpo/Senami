import {
  NodeEnv,
  validateBootstrapSeedEnvironment,
  validateDemoSeedEnvironment,
} from '@config/env.validation.js';
import { SeedLevel } from './seed-level.enum.js';
import type { SeedContext, Seeder } from './seed-context.js';
import { DemoEstablishmentSeeder } from './seeders/demo-establishment.seeder.js';
import { SubscriptionPlanSeeder } from './seeders/subscription-plan.seeder.js';
import { SuperAdminSeeder } from './seeders/super-admin.seeder.js';

const SEED_LEVELS = new Map<string, SeedLevel>(
  Object.values(SeedLevel).map((level) => [level, level]),
);

export function parseSeedLevel(raw: string | undefined): SeedLevel {
  const requested = raw ?? SeedLevel.ALL;
  const level = SEED_LEVELS.get(requested);
  if (level === undefined) {
    throw new Error(
      `Unknown seed level "${requested}", expected one of: ${[...SEED_LEVELS.keys()].join(', ')}`,
    );
  }
  return level;
}

export function assertLevelAllowed(level: SeedLevel, nodeEnv: NodeEnv): void {
  if (nodeEnv === NodeEnv.PRODUCTION && level !== SeedLevel.BOOTSTRAP) {
    throw new Error(`Seed level "${level}" is refused in production`);
  }
}

/** Validates every variable the level needs before anything is written. */
export function seedersFor(
  level: SeedLevel,
  environment: Record<string, unknown>,
): Seeder[] {
  const seeders: Seeder[] = [];
  if (level === SeedLevel.BOOTSTRAP || level === SeedLevel.ALL) {
    seeders.push(
      new SuperAdminSeeder(validateBootstrapSeedEnvironment(environment)),
    );
  }
  if (level === SeedLevel.DEMO || level === SeedLevel.ALL) {
    seeders.push(
      new SubscriptionPlanSeeder(),
      new DemoEstablishmentSeeder(validateDemoSeedEnvironment(environment)),
    );
  }
  return seeders;
}

export async function runSeeders(
  seeders: Seeder[],
  context: SeedContext,
): Promise<void> {
  for (const seeder of seeders) {
    context.logger.info({ seeder: seeder.name }, 'Running seeder');
    await seeder.run(context);
  }
}
