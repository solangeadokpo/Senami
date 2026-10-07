import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SessionIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;
}

export class UserIdParamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;
}
