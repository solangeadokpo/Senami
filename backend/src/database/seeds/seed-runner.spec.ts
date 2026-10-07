import { NodeEnv } from '@config/env.validation.js';
import { SeedLevel } from './seed-level.enum.js';
import {
  assertLevelAllowed,
  parseSeedLevel,
  seedersFor,
} from './seed-runner.js';

const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
const BOOTSTRAP = {
  DATABASE_URL,
  SEED_SUPER_ADMIN_EMAIL: 'admin@example.com',
  SEED_SUPER_ADMIN_PASSWORD: 'a-password-of-12-or-more',
};
const DEMO = { DATABASE_URL, SEED_DEMO_PASSWORD: 'another-password-of-12' };

describe('seed runner', () => {
  it.each([
    ['bootstrap', SeedLevel.BOOTSTRAP],
    ['demo', SeedLevel.DEMO],
    ['all', SeedLevel.ALL],
    [undefined, SeedLevel.ALL],
  ])('parses the level %s', (raw, level) => {
    expect(parseSeedLevel(raw)).toBe(level);
  });

  it('refuses an unknown level', () => {
    expect(() => parseSeedLevel('everything')).toThrow(/Unknown seed level/);
  });

  it('accepts bootstrap in production', () => {
    expect(() =>
      assertLevelAllowed(SeedLevel.BOOTSTRAP, NodeEnv.PRODUCTION),
    ).not.toThrow();
  });

  it.each([SeedLevel.DEMO, SeedLevel.ALL])(
    'refuses %s in production',
    (level) => {
      expect(() => assertLevelAllowed(level, NodeEnv.PRODUCTION)).toThrow(
        /refused in production/,
      );
    },
  );

  it('runs the super admin seeder only for bootstrap', () => {
    expect(
      seedersFor(SeedLevel.BOOTSTRAP, BOOTSTRAP).map((s) => s.name),
    ).toEqual(['super-admin']);
  });

  it('runs the plan before the demo establishment', () => {
    expect(seedersFor(SeedLevel.DEMO, DEMO).map((s) => s.name)).toEqual([
      'subscription-plan',
      'demo-establishment',
    ]);
  });

  it('needs no super admin variable for demo', () => {
    expect(() => seedersFor(SeedLevel.DEMO, DEMO)).not.toThrow();
  });

  it('validates every variable of all before seeding anything', () => {
    expect(() => seedersFor(SeedLevel.ALL, BOOTSTRAP)).toThrow(
      /SEED_DEMO_PASSWORD/,
    );
  });
});
