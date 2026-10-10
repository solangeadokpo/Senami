import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SheetRecipientsResponseDto } from '@modules/sheet-recipients/dto/sheet-recipients-response.dto.js';
import { UpdateSheetRecipientsDto } from '@modules/sheet-recipients/dto/update-sheet-recipients.dto.js';
import {
  SheetRecipientsService,
  type SheetRecipientsView,
} from '@modules/sheet-recipients/services/sheet-recipients.service.js';
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

/** The establishment is the user's own, never a parameter. */
@ApiTags('sheet-recipients')
@Controller('sheet-recipients')
export class SheetRecipientsController {
  constructor(private readonly sheetRecipients: SheetRecipientsService) {}

  /** Mobile too: the summary of the declaration shows the recipients. */
  @Get()
  @Roles(UserRole.RESPONSABLE, UserRole.INTERVENANT)
  @Serialize(SheetRecipientsResponseDto)
  @ApiDataResponse(SheetRecipientsResponseDto)
  @ApiErrorResponses(401, 403)
  find(@CurrentUser() user: AuthenticatedUser): Promise<SheetRecipientsView> {
    return this.sheetRecipients.find(user);
  }

  @Put()
  @Roles(UserRole.RESPONSABLE)
  @Channels(SessionChannel.BACKOFFICE)
  @Serialize(SheetRecipientsResponseDto)
  @ApiDataResponse(SheetRecipientsResponseDto)
  @ApiErrorResponses(400, 401, 403, 422)
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSheetRecipientsDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<SheetRecipientsView> {
    return this.sheetRecipients.replace(user, dto, client);
  }
}
