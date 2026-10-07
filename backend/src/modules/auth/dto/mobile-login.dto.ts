import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class MobileDeviceDto {
  @ApiProperty({
    description: 'Stable identifier of the device',
    maxLength: 128,
  })
  @IsString()
  @Length(1, 128)
  id: string;

  @ApiPropertyOptional({ example: 'iPhone de Léa', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ enum: [DevicePlatform.IOS, DevicePlatform.ANDROID] })
  @IsIn([DevicePlatform.IOS, DevicePlatform.ANDROID])
  platform: DevicePlatform;

  @ApiProperty({ example: '1.0.0', maxLength: 32 })
  @IsString()
  @Length(1, 32)
  appVersion: string;
}

export class MobileLoginDto {
  @ApiProperty({ example: 'lea.martin@ecole.fr' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;

  @ApiProperty({ type: MobileDeviceDto })
  @ValidateNested()
  @Type(() => MobileDeviceDto)
  device: MobileDeviceDto;
}
