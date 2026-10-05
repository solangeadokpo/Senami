import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Swagger schema only: AllExceptionsFilter writes the body.

export class FieldErrorDto {
  @ApiProperty({ example: 'postalCode' })
  field: string;

  @ApiProperty({ example: 'matches' })
  constraint: string;

  @ApiProperty({ example: 'postalCode must be 5 digits' })
  message: string;
}

export class ErrorBodyDto {
  @ApiProperty({ example: 404 })
  status: number;

  @ApiProperty({
    description: 'Stable code clients branch on. The message may change.',
    example: 'STUDENT_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'For developers, in English.',
    example: 'Student not found',
  })
  message: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { studentId: '3f2a6c1e-0b8d-4d7e-9f5a-2c1b7e4d9a10' },
  })
  details?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [FieldErrorDto] })
  fields?: FieldErrorDto[];

  @ApiPropertyOptional({ example: 'b1c9e2f4-7a3d-4c1e-8b6a-0f2d9e5c3a71' })
  requestId?: string;

  @ApiProperty({ format: 'date-time' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/students/3f2a6c1e' })
  path: string;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error: ErrorBodyDto;
}
