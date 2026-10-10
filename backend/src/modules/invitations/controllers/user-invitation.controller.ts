import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserIdParamDto } from '@modules/auth/dto/id-params.dto.js';
import { ResentInvitationResponseDto } from '@modules/invitations/dto/invitation.dto.js';
import { InvitationsService } from '@modules/invitations/services/invitations.service.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '@shared/decorators/api-response.decorator.js';
import { Channels } from '@shared/decorators/channels.decorator.js';
import { ClientInfo } from '@shared/decorators/client-info.decorator.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { Roles } from '@shared/decorators/roles.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

@ApiTags('invitations')
@Channels(SessionChannel.BACKOFFICE)
@Controller('users/:userId/invitation')
export class UserInvitationController {
  constructor(private readonly invitations: InvitationsService) {}

  /** A responsable reaches the users of their establishment only. */
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @HttpCode(HttpStatus.OK)
  @Serialize(ResentInvitationResponseDto)
  @ApiDataResponse(ResentInvitationResponseDto)
  @ApiErrorResponses(400, 401, 403, 404, 409, 503)
  resend(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { userId }: UserIdParamDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<{ expiresAt: Date }> {
    return this.invitations.resend(actor, userId, client);
  }
}
