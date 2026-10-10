import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserIdParamDto } from '@modules/auth/dto/id-params.dto.js';
import { BackofficeAuthService } from '@modules/auth/services/backoffice-auth.service.js';
import { ApiErrorResponses } from '@shared/decorators/api-response.decorator.js';
import { Channels } from '@shared/decorators/channels.decorator.js';
import { ClientInfo } from '@shared/decorators/client-info.decorator.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { Roles } from '@shared/decorators/roles.decorator.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

@ApiTags('auth')
@Channels(SessionChannel.BACKOFFICE)
@Controller('users/:userId/totp')
export class TotpAdminController {
  constructor(private readonly auth: BackofficeAuthService) {}

  /** 2FA-04: a lost device. The next sign-in enrols a new second factor. */
  @Post('reset')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404)
  async reset(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.auth.reset(user, params.userId, client);
  }
}
