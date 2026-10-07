import type { AuthStep } from '@shared/enums/auth-step.enum.js';
import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JsonWebTokenError, JwtService } from '@nestjs/jwt';
import { type AuthConfig, authConfig } from '@config/index.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import { isRecord } from '@shared/utils/is-record.js';

const REFRESH_TOKEN_BYTES = 32;
const CHALLENGE_TTL_MS = 5 * 60_000;
const CHALLENGE_PURPOSE = 'backoffice_challenge';

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async createAccessToken(
    claims: AccessTokenClaims,
  ): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = this.clock.now();
    const expiresAt = new Date(
      issuedAt.getTime() + this.config.accessTokenTtlMinutes * 60_000,
    );
    // iat and exp set from the clock rather than by the library, so that
    // signing and verification agree on the time.
    const token = await this.jwt.signAsync({
      sub: claims.userId,
      sid: claims.sessionId,
      iat: toSeconds(issuedAt),
      exp: toSeconds(expiresAt),
    });
    return { token, expiresAt };
  }

  /** undefined for a forged, malformed or expired token. */
  async verifyAccessToken(
    token: string,
  ): Promise<AccessTokenClaims | undefined> {
    const payload = await this.verify(token);
    if (
      !isRecord(payload) ||
      typeof payload['sub'] !== 'string' ||
      typeof payload['sid'] !== 'string'
    ) {
      return undefined;
    }
    return { userId: payload['sub'], sessionId: payload['sid'] };
  }

  /**
   * Proof that the password was right, valid for the second factor step only:
   * it has no `sid`, so the guard never takes it for an access token.
   */
  async createChallengeToken(
    userId: string,
    step: AuthStep,
  ): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = this.clock.now();
    const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_MS);
    const token = await this.jwt.signAsync({
      sub: userId,
      purpose: CHALLENGE_PURPOSE,
      step,
      iat: toSeconds(issuedAt),
      exp: toSeconds(expiresAt),
    });
    return { token, expiresAt };
  }

  /** The user id, or undefined if forged, expired or of another step. */
  async verifyChallengeToken(
    token: string,
    expectedStep: AuthStep,
  ): Promise<string | undefined> {
    const payload = await this.verify(token);
    if (
      !isRecord(payload) ||
      payload['purpose'] !== CHALLENGE_PURPOSE ||
      payload['step'] !== expectedStep ||
      typeof payload['sub'] !== 'string'
    ) {
      return undefined;
    }
    return payload['sub'];
  }

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  /** SHA-256 is enough: the token is random, not a guessable password. */
  hashToken(token: string): Buffer {
    return createHash('sha256').update(token).digest();
  }

  private async verify(token: string): Promise<unknown> {
    try {
      return await this.jwt.verifyAsync(token, {
        clockTimestamp: toSeconds(this.clock.now()),
      });
    } catch (error: unknown) {
      if (error instanceof JsonWebTokenError) return undefined;
      throw error;
    }
  }
}

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
