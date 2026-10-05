import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import { PaginatedResult } from '@shared/dto/paginated-result.js';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto.js';
import { NotFoundError } from '@shared/errors/domain.error.js';

class ProbeNotFoundError extends NotFoundError {
  readonly code = 'PROBE_NOT_FOUND';
  constructor(probeId: string) {
    super('Probe not found', { details: { probeId } });
  }
}

class CreateProbeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(/^[0-9]{5}$/)
  postalCode: string;
}

class ProbeResponseDto {
  @Expose()
  id: string;
}

/** Test-only endpoints exercising the HTTP contract. */
@Controller('probe')
export class ProbeController {
  @Get('missing/:probeId')
  missing(@Param('probeId') probeId: string): never {
    throw new ProbeNotFoundError(probeId);
  }

  @Post()
  create(@Body() dto: CreateProbeDto): CreateProbeDto {
    return dto;
  }

  @Get('crash')
  crash(): never {
    throw new Error('secret internal detail');
  }

  @Get('item')
  @Serialize(ProbeResponseDto)
  item(): { id: string; secret: string } {
    return { id: 'p1', secret: 'hidden' };
  }

  @Get('items')
  items(@Query() query: PaginationQueryDto): PaginatedResult<{ id: string }> {
    return PaginatedResult.of([{ id: 'p1' }], 41, query.page, query.limit);
  }

  @Delete(':probeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(): void {}
}
