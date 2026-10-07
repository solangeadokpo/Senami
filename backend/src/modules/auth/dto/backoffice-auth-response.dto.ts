import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AuthStep } from '@shared/enums/auth-step.enum.js';
import { AuthUserDto } from './auth-response.dto.js';

export class ChallengeResponseDto {
  @ApiProperty({ enum: AuthStep })
  @Expose()
  step: AuthStep;

  @ApiProperty()
  @Expose()
  challengeToken: string;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  challengeExpiresAt: Date;
}

export class TotpEnrolmentResponseDto {
  @ApiProperty({ description: 'To draw the QR code from' })
  @Expose()
  otpauthUrl: string;

  @ApiProperty({ description: 'Base32 secret, for manual entry' })
  @Expose()
  secret: string;
}

export class BackofficeSessionResponseDto {
  @ApiProperty({ type: AuthUserDto })
  @Expose()
  @Type(() => AuthUserDto)
  user: AuthUserDto;
}

export class EnrolmentConfirmedResponseDto extends BackofficeSessionResponseDto {
  @ApiProperty({ type: [String], description: 'Shown once, never again' })
  @Expose()
  recoveryCodes: string[];
}

export class RecoveryResponseDto extends BackofficeSessionResponseDto {
  @ApiProperty()
  @Expose()
  remainingRecoveryCodes: number;
}
