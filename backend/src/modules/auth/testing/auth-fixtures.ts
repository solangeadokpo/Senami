import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import type { AuthConfig } from '@config/auth.config.js';
import type { FakeClock } from '@shared/testing/fake-clock.js';
import type { Account } from '@modules/auth/repositories/auth.repository.js';
import { TokenService } from '@modules/auth/services/token.service.js';

export const TEST_AUTH_CONFIG: AuthConfig = {
  jwtSecret: 'unit-test-secret-of-at-least-32-characters',
  accessTokenTtlMinutes: 15,
  mobileSessionDays: 30,
  backofficeSessionHours: 12,
  totpEncryptionKey: Buffer.alloc(32, 7),
  secureCookies: false,
};

export function createTokenService(clock: FakeClock): TokenService {
  const jwt = new JwtService({
    secret: TEST_AUTH_CONFIG.jwtSecret,
    signOptions: { algorithm: 'HS256' },
    verifyOptions: { algorithms: ['HS256'] },
  });
  return new TokenService(jwt, TEST_AUTH_CONFIG, clock);
}

export const ESTABLISHMENT_ID = '7d3f6a2e-1c4b-4e8a-9f20-5b6c7d8e9f01';

export function buildAccount(
  overrides: Partial<Account> = {},
  passwordHash: string | null = null,
): Account & { passwordHash: string | null } {
  return {
    userId: randomUUID(),
    email: `${randomUUID()}@ecole.test`,
    firstName: 'Léa',
    lastName: 'Martin',
    role: UserRole.INTERVENANT,
    status: UserStatus.ACTIVE,
    establishment: {
      id: ESTABLISHMENT_ID,
      name: 'École Saint-Denis',
      status: EstablishmentStatus.ACTIVE,
    },
    subscription: { status: SubscriptionStatus.ACTIVE, currentPeriodEnd: null },
    ...overrides,
    passwordHash,
  };
}
