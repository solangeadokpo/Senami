import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsEmail, MaxLength } from 'class-validator';

const trimEach = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item: unknown) =>
        typeof item === 'string' ? item.trim() : item,
      )
    : value;

/** The three lists replace the current ones; `cc` and `bcc` may be empty. */
export class UpdateSheetRecipientsDto {
  @ApiProperty({ type: [String], example: ['direction@ecole.fr'] })
  @Transform(trimEach)
  @IsArray()
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  to: string[];

  @ApiProperty({ type: [String], example: ['infirmerie@ecole.fr'] })
  @Transform(trimEach)
  @IsArray()
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  cc: string[];

  @ApiProperty({ type: [String], example: [] })
  @Transform(trimEach)
  @IsArray()
  @IsEmail({}, { each: true })
  @MaxLength(254, { each: true })
  bcc: string[];
}
