import { JwtService } from '@nestjs/jwt';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
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

  describe('challenge token', () => {
    it('carries the user for the expected step, five minutes', async () => {
      const { token, expiresAt } = await tokens.createChallengeToken(
        'u1',
        AuthStep.TOTP_VERIFICATION,
      );

      expect(
        await tokens.verifyChallengeToken(token, AuthStep.TOTP_VERIFICATION),
      ).toBe('u1');
      expect(expiresAt.getTime() - clock.now().getTime()).toBe(5 * MINUTE_MS);
    });

    it('is refused for another step', async () => {
      const { token } = await tokens.createChallengeToken(
        'u1',
        AuthStep.TOTP_ENROLMENT,
      );

      expect(
        await tokens.verifyChallengeToken(token, AuthStep.TOTP_VERIFICATION),
      ).toBeUndefined();
    });

    it('is refused once expired', async () => {
      const { token } = await tokens.createChallengeToken(
        'u1',
        AuthStep.TOTP_VERIFICATION,
      );

      clock.advance(6 * MINUTE_MS);

      expect(
        await tokens.verifyChallengeToken(token, AuthStep.TOTP_VERIFICATION),
      ).toBeUndefined();
    });

    it('is not an access token, and an access token is not one', async () => {
      const challenge = await tokens.createChallengeToken(
        'u1',
        AuthStep.TOTP_VERIFICATION,
      );
      const access = await tokens.createAccessToken({
        userId: 'u1',
        sessionId: 's1',
      });

      expect(await tokens.verifyAccessToken(challenge.token)).toBeUndefined();
      expect(
        await tokens.verifyChallengeToken(
          access.token,
          AuthStep.TOTP_VERIFICATION,
        ),
      ).toBeUndefined();
    });
  });
});
