import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  CreateEstablishmentDto,
  EstablishmentIdParamDto,
  ListEstablishmentsQueryDto,
  SuspendEstablishmentDto,
  UpdateEstablishmentDto,
} from '@modules/establishments/dto/establishment-requests.dto.js';
import {
  CreatedEstablishmentResponseDto,
  EstablishmentDetailResponseDto,
  EstablishmentSummaryResponseDto,
} from '@modules/establishments/dto/establishment-responses.dto.js';
import {
  type CreatedEstablishment,
  EstablishmentsService,
} from '@modules/establishments/services/establishments.service.js';
import type {
  EstablishmentDetail,
  EstablishmentSummary,
} from '@modules/establishments/repositories/establishments.repository.js';
import { MAX_LOGO_BYTES } from '@modules/establishments/utils/logo-file.js';
import {
  ApiDataResponse,
  ApiErrorResponses,
  ApiPaginatedResponse,
} from '@shared/decorators/api-response.decorator.js';
import { Channels } from '@shared/decorators/channels.decorator.js';
import { ClientInfo } from '@shared/decorators/client-info.decorator.js';
import { CurrentUser } from '@shared/decorators/current-user.decorator.js';
import { RawResponse } from '@shared/decorators/raw-response.decorator.js';
import { Roles } from '@shared/decorators/roles.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import type { PaginatedResult } from '@shared/dto/paginated-result.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface.js';
import type { ClientDetails } from '@shared/interfaces/client-details.interface.js';

/**
 * Back office only. A responsable reaches their own establishment and gets
 * 404 for any other (checked by the service).
 */
@ApiTags('establishments')
@Channels(SessionChannel.BACKOFFICE)
@Controller('establishments')
export class EstablishmentsController {
  constructor(private readonly establishments: EstablishmentsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @Serialize(EstablishmentSummaryResponseDto)
  @ApiPaginatedResponse(EstablishmentSummaryResponseDto)
  @ApiErrorResponses(400, 401, 403)
  list(
    @Query() query: ListEstablishmentsQueryDto,
  ): Promise<PaginatedResult<EstablishmentSummary>> {
    return this.establishments.list(query);
  }

  @Get('cities')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiDataResponse(String, { isArray: true })
  @ApiErrorResponses(401, 403)
  cities(): Promise<string[]> {
    return this.establishments.cities();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @Serialize(CreatedEstablishmentResponseDto)
  @ApiDataResponse(CreatedEstablishmentResponseDto, {
    status: HttpStatus.CREATED,
  })
  @ApiErrorResponses(400, 401, 403, 409, 503)
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEstablishmentDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<CreatedEstablishment> {
    return this.establishments.create(actor, dto, client);
  }

  @Get(':establishmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @Serialize(EstablishmentDetailResponseDto)
  @ApiDataResponse(EstablishmentDetailResponseDto)
  @ApiErrorResponses(400, 401, 403, 404)
  detail(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
  ): Promise<EstablishmentDetail> {
    return this.establishments.detail(actor, establishmentId);
  }

  @Patch(':establishmentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @Serialize(EstablishmentDetailResponseDto)
  @ApiDataResponse(EstablishmentDetailResponseDto)
  @ApiErrorResponses(400, 401, 403, 404)
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
    @Body() dto: UpdateEstablishmentDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<EstablishmentDetail> {
    return this.establishments.update(
      actor,
      establishmentId,
      definedFields(dto),
      client,
    );
  }

  @Post(':establishmentId/suspension')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404, 409)
  async suspend(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
    @Body() { reason }: SuspendEstablishmentDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.establishments.suspend(actor, establishmentId, reason, client);
  }

  @Delete(':establishmentId/suspension')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404, 409)
  async reactivate(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.establishments.reactivate(actor, establishmentId, client);
  }

  @Put(':establishmentId/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  // The upload stops at the limit: a larger file is never held in memory.
  @UseInterceptors(
    FileInterceptor('logo', { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiErrorResponses(400, 401, 403, 404, 413, 422)
  async setLogo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.establishments.setLogo(actor, establishmentId, file, client);
  }

  @Delete(':establishmentId/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiErrorResponses(400, 401, 403, 404)
  async removeLogo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
    @ClientInfo() client: ClientDetails,
  ): Promise<void> {
    await this.establishments.removeLogo(actor, establishmentId, client);
  }

  @Get(':establishmentId/logo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.RESPONSABLE)
  @RawResponse()
  // Per user: never in a shared cache.
  @Header('Cache-Control', 'private, no-cache')
  @ApiErrorResponses(400, 401, 403, 404)
  async logo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param() { establishmentId }: EstablishmentIdParamDto,
  ): Promise<StreamableFile> {
    const logo = await this.establishments.logo(actor, establishmentId);
    return new StreamableFile(logo.content, {
      type: logo.mimeType,
      disposition: 'inline',
      length: logo.content.length,
    });
  }
}

/** class-transformer leaves the absent fields undefined: drop them. */
function definedFields<T extends object>(dto: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
