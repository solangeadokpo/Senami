import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum.js';
import { EstablishmentType } from '@shared/enums/establishment-type.enum.js';
import { SubscriptionStatus } from '@shared/enums/subscription-status.enum.js';
import { UserRole } from '@shared/enums/user-role.enum.js';
import { UserStatus } from '@shared/enums/user-status.enum.js';

export class EstablishmentResponsableDto {
  @ApiProperty({ format: 'uuid' }) @Expose() userId: string;
  @ApiProperty() @Expose() firstName: string;
  @ApiProperty() @Expose() lastName: string;
  @ApiProperty() @Expose() email: string;
  @ApiProperty({ enum: UserStatus }) @Expose() status: UserStatus;
  @ApiProperty() @Expose() isSecondFactorEnrolled: boolean;
}

export class EstablishmentSubscriptionDto {
  @ApiProperty({ enum: SubscriptionStatus })
  @Expose()
  status: SubscriptionStatus;
  @ApiProperty() @Expose() planName: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Expose()
  @Type(() => Date)
  currentPeriodEnd: Date | null;
}

export class EstablishmentSummaryResponseDto {
  @ApiProperty({ format: 'uuid' }) @Expose() id: string;
  @ApiProperty() @Expose() name: string;
  @ApiProperty({ enum: EstablishmentType }) @Expose() type: EstablishmentType;
  @ApiProperty() @Expose() city: string;
  @ApiProperty({ enum: EstablishmentStatus })
  @Expose()
  status: EstablishmentStatus;
  @ApiProperty() @Expose() isDemo: boolean;
  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({ type: EstablishmentResponsableDto, nullable: true })
  @Expose()
  @Type(() => EstablishmentResponsableDto)
  responsable: EstablishmentResponsableDto | null;

  @ApiProperty({ type: EstablishmentSubscriptionDto, nullable: true })
  @Expose()
  @Type(() => EstablishmentSubscriptionDto)
  subscription: EstablishmentSubscriptionDto | null;

  @ApiProperty({ description: 'A counter, never a sheet' })
  @Expose()
  declarationsThisMonth: number;
}

export class UserCountDto {
  @ApiProperty({ enum: UserRole }) @Expose() role: UserRole;
  @ApiProperty({ enum: UserStatus }) @Expose() status: UserStatus;
  @ApiProperty() @Expose() count: number;
}

export class EstablishmentDetailResponseDto extends EstablishmentSummaryResponseDto {
  @ApiProperty() @Expose() addressLine: string;
  @ApiProperty() @Expose() postalCode: string;
  @ApiProperty({ type: String, nullable: true }) @Expose() phone: string | null;
  @ApiProperty({ type: String, nullable: true }) @Expose() email: string | null;
  @ApiProperty({ type: Number, nullable: true }) @Expose() approxStudentCount:
    number | null;
  @ApiProperty() @Expose() hasLogo: boolean;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  @Expose()
  @Type(() => Date)
  suspendedAt: Date | null;

  @ApiProperty({ type: String, nullable: true }) @Expose() suspensionReason:
    string | null;

  @ApiProperty({ type: [UserCountDto] })
  @Expose()
  @Type(() => UserCountDto)
  users: UserCountDto[];
}

export class InvitationOutcomeDto {
  @ApiProperty({ description: 'false: the email failed, resend it' })
  @Expose()
  sent: boolean;
  @ApiProperty({ format: 'date-time' })
  @Expose()
  @Type(() => Date)
  expiresAt: Date;
}

export class CreatedEstablishmentResponseDto {
  @ApiProperty({ type: EstablishmentDetailResponseDto })
  @Expose()
  @Type(() => EstablishmentDetailResponseDto)
  establishment: EstablishmentDetailResponseDto;

  @ApiProperty({ type: InvitationOutcomeDto })
  @Expose()
  @Type(() => InvitationOutcomeDto)
  invitation: InvitationOutcomeDto;
}
