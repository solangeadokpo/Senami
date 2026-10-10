import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AcceptInvitationDto,
  InvitationResponseDto,
  InvitationTokenDto,
} from '@modules/invitations/dto/invitation.dto.js';
import {
  InvitationsService,
  type InvitationView,
} from '@modules/invitations/services/invitations.service.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '@shared/decorators/api-response.decorator.js';
import { ClientInfo } from '@shared/decorators/client-info.decorator.js';
import { Public } from '@shared/decorators/public.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

const ONE_MINUTE_MS = 60_000;

/** The token travels in the body only: never in a path, so never in a log. */
@ApiTags('invitations')
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: ONE_MINUTE_MS } })
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @Serialize(InvitationResponseDto)
  @ApiDataResponse(InvitationResponseDto)
  @ApiErrorResponses(400, 404, 422, 429)
  lookup(@Body() { token }: InvitationTokenDto): Promise<InvitationView> {
    return this.invitations.lookup(token);
  }

  @Post('acceptance')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 404, 422, 429)
  async accept(
    @Body() { token, password }: AcceptInvitationDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.invitations.accept(token, password, client);
  }
}
