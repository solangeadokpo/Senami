import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class BackofficeLoginDto {
  @ApiProperty({ example: 'responsable@demo.senami.fr' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class ChallengeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  challengeToken: string;
}

export class TotpCodeDto extends ChallengeDto {
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'code must be 6 digits' })
  code: string;
}

export class RecoveryCodeDto extends ChallengeDto {
  @ApiProperty({ example: 'K7Q2M-9XWPA' })
  @IsString()
  @Length(10, 16)
  recoveryCode: string;
}
