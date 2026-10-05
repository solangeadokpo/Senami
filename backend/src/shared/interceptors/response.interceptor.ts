import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
  type Type,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { type Observable, map } from 'rxjs';
import { RAW_RESPONSE } from '@shared/decorators/raw-response.decorator.js';
import { SERIALIZE_DTO } from '@shared/decorators/serialize.decorator.js';
import { PaginatedResult } from '@shared/dto/paginated-result.js';

/** Wraps what a controller returns into `{ data }` or `{ data, meta }`. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, targets)) {
      return next.handle();
    }

    const dto = this.reflector.getAllAndOverride<Type<unknown> | undefined>(
      SERIALIZE_DTO,
      targets,
    );

    return next.handle().pipe(
      map((value: unknown) => {
        if (value === undefined || value === null) {
          return undefined;
        }
        if (value instanceof StreamableFile) {
          return value;
        }
        if (value instanceof PaginatedResult) {
          return {
            data: serialize(value.items, dto),
            meta: value.meta,
          };
        }
        return { data: serialize(value, dto) };
      }),
    );
  }
}

// excludeExtraneousValues makes the DTO an allow-list.
function serialize(value: unknown, dto: Type<unknown> | undefined): unknown {
  if (dto === undefined) {
    return value;
  }
  return plainToInstance(dto, value, { excludeExtraneousValues: true });
}
