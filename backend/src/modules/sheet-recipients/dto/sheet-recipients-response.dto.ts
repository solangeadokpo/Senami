import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SheetRecipientsResponseDto {
  @ApiProperty({ type: [String] }) @Expose() to: string[];
  @ApiProperty({ type: [String] }) @Expose() cc: string[];
  @ApiProperty({ type: [String] }) @Expose() bcc: string[];

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'null: no recipient saved yet',
  })
  @Expose()
  @Type(() => Date)
  updatedAt: Date | null;
}
