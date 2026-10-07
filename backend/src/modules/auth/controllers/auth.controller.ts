import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { Public } from '@shared/decorators/public.decorator.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '@shared/decorators/api-response.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import {
  AuthService,
  type MeView,
  type TokenPair,
  type AuthUserView,
} from '@modules/auth/services/auth.service.js';
import {
  MeResponseDto,
  MobileLoginResponseDto,
  TokenPairDto,
} from '@modules/auth/dto/auth-response.dto.js';
import { MobileLoginDto } from '@modules/auth/dto/mobile-login.dto.js';
import { RefreshTokenDto } from '@modules/auth/dto/refresh-token.dto.js';
import { LoginThrottlerGuard } from '@modules/auth/guards/login-throttler.guard.js';

const ONE_MINUTE_MS = 60_000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('mobile/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
  @Serialize(MobileLoginResponseDto)
  @ApiDataResponse(MobileLoginResponseDto)
  @ApiErrorResponses(400, 401, 403, 429)
  login(
    @Body() dto: MobileLoginDto,
  ): Promise<TokenPair & { user: AuthUserView }> {
    return this.auth.loginMobile(dto);
  }

  @Public()
  @Post('mobile/refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: ONE_MINUTE_MS } })
  @Serialize(TokenPairDto)
  @ApiDataResponse(TokenPairDto)
  @ApiErrorResponses(400, 401, 403, 429)
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.auth.refreshMobile(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiErrorResponses(401)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auth.logout(user);
  }

  @Get('me')
  @Serialize(MeResponseDto)
  @ApiBearerAuth()
  @ApiDataResponse(MeResponseDto)
  @ApiErrorResponses(401, 403)
  me(@CurrentUser() user: AuthenticatedUser): Promise<MeView> {
    return this.auth.me(user);
  }
}
