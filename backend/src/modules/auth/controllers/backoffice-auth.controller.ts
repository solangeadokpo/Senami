import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { type AuthConfig, authConfig } from '@config/index.js';
import { SESSION_COOKIE } from '@modules/auth/auth.constants.js';
import {
  BackofficeLoginDto,
  ChallengeDto,
  RecoveryCodeDto,
  TotpCodeDto,
} from '@modules/auth/dto/backoffice-auth.dto.js';
import {
  BackofficeSessionResponseDto,
  ChallengeResponseDto,
  EnrolmentConfirmedResponseDto,
  RecoveryResponseDto,
  TotpEnrolmentResponseDto,
} from '@modules/auth/dto/backoffice-auth-response.dto.js';
import { LoginThrottlerGuard } from '@modules/auth/guards/login-throttler.guard.js';
import {
  BackofficeAuthService,
  type Challenge,
  type OpenedSession,
} from '@modules/auth/services/backoffice-auth.service.js';
import type { AuthUserView } from '@modules/auth/services/auth.service.js';
import { sessionCookieOptions } from '@modules/auth/session-cookie.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '@shared/decorators/api-response.decorator.js';
import { ClientInfo } from '@shared/decorators/client-info.decorator.js';
import { Public } from '@shared/decorators/public.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

const ONE_MINUTE_MS = 60_000;

/** The challenge token is the credential of the second factor steps. */
@ApiTags('auth')
@Public()
@Controller('auth/backoffice')
export class BackofficeAuthController {
  constructor(
    private readonly auth: BackofficeAuthService,
    @Inject(authConfig.KEY)
    private readonly config: Pick<AuthConfig, 'secureCookies'>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  @Serialize(ChallengeResponseDto)
  @ApiDataResponse(ChallengeResponseDto)
  @ApiErrorResponses(400, 401, 403, 429)
  login(@Body() dto: BackofficeLoginDto): Promise<Challenge> {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('totp/enrolment')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } })
  @Serialize(TotpEnrolmentResponseDto)
  @ApiDataResponse(TotpEnrolmentResponseDto)
  @ApiErrorResponses(400, 401, 403, 409, 429)
  startEnrolment(
    @Body() dto: ChallengeDto,
  ): Promise<{ otpauthUrl: string; secret: string }> {
    return this.auth.startEnrolment(dto.challengeToken);
  }

  @Post('totp/enrolment/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } })
  @Serialize(EnrolmentConfirmedResponseDto)
  @ApiDataResponse(EnrolmentConfirmedResponseDto)
  @ApiErrorResponses(400, 401, 403, 409, 429)
  async confirmEnrolment(
    @Body() dto: TotpCodeDto,
    @ClientInfo() client: ClientDetails,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUserView; recoveryCodes: string[] }> {
    const opened = await this.auth.confirmEnrolment(
      dto.challengeToken,
      dto.code,
      client,
    );
    this.setCookie(response, opened);
    return { user: opened.user, recoveryCodes: opened.recoveryCodes };
  }

  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } })
  @Serialize(BackofficeSessionResponseDto)
  @ApiDataResponse(BackofficeSessionResponseDto)
  @ApiErrorResponses(400, 401, 403, 409, 429)
  async verify(
    @Body() dto: TotpCodeDto,
    @ClientInfo() client: ClientDetails,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUserView }> {
    const opened = await this.auth.verify(dto.challengeToken, dto.code, client);
    this.setCookie(response, opened);
    return { user: opened.user };
  }

  @Post('totp/recovery')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: ONE_MINUTE_MS } })
  @Serialize(RecoveryResponseDto)
  @ApiDataResponse(RecoveryResponseDto)
  @ApiErrorResponses(400, 401, 403, 409, 429)
  async recover(
    @Body() dto: RecoveryCodeDto,
    @ClientInfo() client: ClientDetails,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUserView; remainingRecoveryCodes: number }> {
    const opened = await this.auth.recover(
      dto.challengeToken,
      dto.recoveryCode,
      client,
    );
    this.setCookie(response, opened);
    return {
      user: opened.user,
      remainingRecoveryCodes: opened.remainingRecoveryCodes,
    };
  }

  private setCookie(response: Response, opened: OpenedSession): void {
    response.cookie(
      SESSION_COOKIE,
      opened.sessionToken,
      sessionCookieOptions(this.config, opened.sessionExpiresAt),
    );
  }
}
