import { HttpStatus, type Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorResponseDto } from '@shared/dto/error-response.dto.js';
import { PaginationMeta } from '@shared/dto/paginated-result.js';

/** Documents `{ data: <dto> }`, or `{ data: <dto>[] }` with `isArray`. */
export function ApiDataResponse(
  dto: Type<unknown>,
  options: { status?: HttpStatus; isArray?: boolean } = {},
) {
  const item = { $ref: getSchemaPath(dto) };
  return applyDecorators(
    ApiExtraModels(dto),
    ApiResponse({
      status: options.status ?? HttpStatus.OK,
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data:
            options.isArray === true ? { type: 'array', items: item } : item,
        },
      },
    }),
  );
}

/** Documents `{ data: <dto>[], meta }`. */
export function ApiPaginatedResponse(dto: Type<unknown>) {
  return applyDecorators(
    ApiExtraModels(dto, PaginationMeta),
    ApiResponse({
      status: HttpStatus.OK,
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(dto) } },
          meta: { $ref: getSchemaPath(PaginationMeta) },
        },
      },
    }),
  );
}

/** Documents the error body for each status the endpoint can return. */
export function ApiErrorResponses(...statuses: HttpStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, type: ErrorResponseDto }),
    ),
  );
}
