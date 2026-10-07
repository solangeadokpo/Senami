import { UserRole } from '@shared/enums/user-role.enum.js';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { Roles } from '@shared/decorators/roles.decorator.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
} from '@shared/decorators/api-response.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import { SessionResponseDto } from '@modules/auth/dto/auth-response.dto.js';
import {
  SessionIdParamDto,
  UserIdParamDto,
} from '@modules/auth/dto/id-params.dto.js';
import {
  SessionsService,
  type SessionView,
} from '@modules/auth/services/sessions.service.js';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller()
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get('auth/sessions')
  @Serialize(SessionResponseDto)
  @ApiDataResponse(SessionResponseDto, { isArray: true })
  @ApiErrorResponses(401, 403)
  list(@CurrentUser() user: AuthenticatedUser): Promise<SessionView[]> {
    return this.sessions.listOwn(user);
  }

  @Delete('auth/sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404)
  async revokeOwn(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: SessionIdParamDto,
  ): Promise<void> {
    await this.sessions.revokeOwn(user, params.sessionId);
  }

  @Delete('users/:userId/sessions')
  @Roles(UserRole.RESPONSABLE, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404)
  async revokeAllOfUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: UserIdParamDto,
  ): Promise<void> {
    await this.sessions.revokeAllOfUser(user, params.userId);
  }
}
