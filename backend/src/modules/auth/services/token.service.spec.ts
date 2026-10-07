import { JwtService } from '@nestjs/jwt';
import { FakeClock, MINUTE_MS } from '@shared/testing/fake-clock.js';
import {
  TEST_AUTH_CONFIG,
  createTokenService,
} from '@modules/auth/testing/auth-fixtures.js';
import { type TokenService } from './token.service.js';

describe('TokenService', () => {
  let clock: FakeClock;
  let tokens: TokenService;

  beforeEach(() => {
    clock = new FakeClock();
    tokens = createTokenService(clock);
  });

  it('issues an access token carrying the user and the session', async () => {
    const { token, expiresAt } = await tokens.createAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    expect(await tokens.verifyAccessToken(token)).toEqual({
      userId: 'u1',
      sessionId: 's1',
    });
    expect(expiresAt.getTime() - clock.now().getTime()).toBe(15 * MINUTE_MS);
  });

  it('rejects an access token once expired', async () => {
    const { token } = await tokens.createAccessToken({
      userId: 'u1',
      sessionId: 's1',
    });

    clock.advance(16 * MINUTE_MS);

    expect(await tokens.verifyAccessToken(token)).toBeUndefined();
  });

  it('rejects a token signed with another secret', async () => {
    const forger = new JwtService({
      secret: 'another-secret-of-at-least-32-chars!',
    });
    const forged = await forger.signAsync({ sub: 'u1', sid: 's1' });

    expect(await tokens.verifyAccessToken(forged)).toBeUndefined();
  });

  it('rejects a malformed token', async () => {
    expect(await tokens.verifyAccessToken('not-a-jwt')).toBeUndefined();
  });

  it('rejects a token without session claim', async () => {
    const jwt = new JwtService({ secret: TEST_AUTH_CONFIG.jwtSecret });
    const token = await jwt.signAsync({ sub: 'u1' });

    expect(await tokens.verifyAccessToken(token)).toBeUndefined();
  });

  it('generates a random 32 byte refresh token', () => {
    const first = tokens.generateRefreshToken();

    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(tokens.generateRefreshToken()).not.toBe(first);
  });

  it('hashes a token the same way every time', () => {
    expect(tokens.hashToken('abc').equals(tokens.hashToken('abc'))).toBe(true);
    expect(tokens.hashToken('abc')).toHaveLength(32);
  });
});
