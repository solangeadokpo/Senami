import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import { type AuthConfig, authConfig } from '@config/index.js';
import { CLOCK, type Clock } from '@shared/interfaces/clock.interface.js';
import { isRecord } from '@shared/utils/is-record.js';

const REFRESH_TOKEN_BYTES = 32;

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
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, {
        clockTimestamp: toSeconds(this.clock.now()),
      });
    } catch (error: unknown) {
      if (
        error instanceof JsonWebTokenError ||
        error instanceof TokenExpiredError
      ) {
        return undefined;
      }
      throw error;
    }

    if (
      !isRecord(payload) ||
      typeof payload['sub'] !== 'string' ||
      typeof payload['sid'] !== 'string'
    ) {
      return undefined;
    }
    return { userId: payload['sub'], sessionId: payload['sid'] };
  }

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  /** SHA-256 is enough: the token is random, not a guessable password. */
  hashToken(token: string): Buffer {
    return createHash('sha256').update(token).digest();
  }
}

function toSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
