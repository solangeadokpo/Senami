import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsString, Length, MaxLength } from 'class-validator';
import { UserRole } from '@shared/enums/user-role.enum.js';

export class InvitationTokenDto {
  @ApiProperty({ description: 'From the # of the invitation link' })
  @IsString()
  @Length(20, 128)
  token: string;
}

export class AcceptInvitationDto extends InvitationTokenDto {
  @ApiProperty({ minLength: 12, maxLength: 128 })
  @IsString()
  @Length(12, 128, { message: 'password must be 12 to 128 characters' })
  @MaxLength(128)
  password: string;
}

export class InvitationResponseDto {
  @ApiProperty()
  @Expose()
  firstName: string;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ enum: UserRole })
  @Expose()
  role: UserRole;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  establishmentName: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  establishmentCity: string | null;

  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  expiresAt: Date;
}

export class ResentInvitationResponseDto {
  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  expiresAt: Date;
}
