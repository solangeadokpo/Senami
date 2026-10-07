import { DevicePlatform } from '@shared/enums/device-platform.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { SessionChannel } from '@shared/enums/session-channel.enum.js';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class EstablishmentSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'École Saint-Denis' })
  @Expose()
  name: string;
}

export class SubscriptionSummaryDto {
  @ApiProperty({
    enum: SubscriptionStatus,
  })
  @Expose()
  status: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Expose()
  @Type(() => Date)
  currentPeriodEnd: Date | null;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'lea.martin@ecole.fr' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'Léa' })
  @Expose()
  firstName: string;

  @ApiProperty({ example: 'Martin' })
  @Expose()
  lastName: string;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: string;

  @ApiProperty({ type: EstablishmentSummaryDto, nullable: true })
  @Expose()
  @Type(() => EstablishmentSummaryDto)
  establishment: EstablishmentSummaryDto | null;
}

export class TokenPairDto {
  @ApiProperty()
  @Expose()
  accessToken: string;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  accessTokenExpiresAt: Date;

  @ApiProperty()
  @Expose()
  refreshToken: string;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  sessionExpiresAt: Date;
}

export class MobileLoginResponseDto extends TokenPairDto {
  @ApiProperty({ type: AuthUserDto })
  @Expose()
  @Type(() => AuthUserDto)
  user: AuthUserDto;
}

export class MeResponseDto extends AuthUserDto {
  @ApiProperty({ enum: SessionChannel })
  @Expose()
  channel: string;

  @ApiProperty({ type: SubscriptionSummaryDto, nullable: true })
  @Expose()
  @Type(() => SubscriptionSummaryDto)
  subscription: SubscriptionSummaryDto | null;
}

export class SessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  @Expose()
  id: string;

  @ApiProperty({ enum: SessionChannel })
  @Expose()
  channel: string;

  @ApiProperty({ type: String, nullable: true, example: 'iPhone de Léa' })
  @Expose()
  deviceName: string | null;

  @ApiProperty({ type: String, nullable: true, example: DevicePlatform.IOS })
  @Expose()
  platform: string | null;

  @ApiProperty({ type: String, nullable: true, example: '1.0.0' })
  @Expose()
  appVersion: string | null;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  lastUsedAt: Date;

  @ApiProperty({ description: 'The session of this request' })
  @Expose()
  current: boolean;
}
