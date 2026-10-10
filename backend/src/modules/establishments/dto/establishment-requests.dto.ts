import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '@shared/dto/pagination-query.dto.js';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
/** An empty optional field reads as absent. */
const trimToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class EstablishmentIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  establishmentId: string;
}

export class EstablishmentFieldsDto {
  @ApiProperty({ example: 'École Sainte-Marie', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ enum: EstablishmentType })
  @IsEnum(EstablishmentType)
  type: EstablishmentType;

  @ApiProperty({ example: '12 rue des Écoles', maxLength: 200 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  addressLine: string;

  @ApiProperty({ example: '59000' })
  @Transform(trim)
  @Matches(/^\d{5}$/, { message: 'postalCode must be 5 digits' })
  postalCode: string;

  @ApiProperty({ example: 'Lille', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '03 20 00 00 00',
  })
  @Transform(trimToNull)
  @IsOptional()
  @Matches(/^[0-9 +().-]{6,30}$/, { message: 'phone must be a phone number' })
  phone: string | null = null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'contact@ecole.fr',
  })
  @Transform(trimToNull)
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email: string | null = null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 250 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  approxStudentCount: number | null = null;
}

export class ResponsableDto {
  @ApiProperty({ example: 'Claire' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Houngbo' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'direction@ecole.fr' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class CreateEstablishmentDto {
  @ApiProperty({ type: EstablishmentFieldsDto })
  @ValidateNested()
  @Type(() => EstablishmentFieldsDto)
  establishment: EstablishmentFieldsDto;

  @ApiProperty({ type: ResponsableDto })
  @ValidateNested()
  @Type(() => ResponsableDto)
  responsable: ResponsableDto;
}

/** Any subset of the fields; `type` for the super admin only. */
export class UpdateEstablishmentDto extends PartialType(
  EstablishmentFieldsDto,
) {}

export class ListEstablishmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Name or responsable email' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ enum: EstablishmentStatus })
  @IsOptional()
  @IsEnum(EstablishmentStatus)
  status?: EstablishmentStatus;
}

export class SuspendEstablishmentDto {
  @ApiProperty({
    minLength: 3,
    maxLength: 500,
    example: 'Abonnement impayé depuis septembre',
  })
  @Transform(trim)
  @IsString()
  @Length(3, 500)
  reason: string;
}
