import { StreamableFile } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import { Expose } from 'class-transformer';
import { firstValueFrom, of } from 'rxjs';
import { RawResponse } from '@shared/decorators/raw-response.decorator.js';
import { Serialize } from '@shared/decorators/serialize.decorator.js';
import { PaginatedResult } from '@shared/dto/paginated-result.js';
import { ResponseInterceptor } from './response.interceptor.js';

class StudentResponseDto {
  @Expose()
  id: string;

  @Expose()
  firstName: string;
}

class ProbeController {
  plain(this: void): void {}

  @RawResponse()
  raw(this: void): void {}

  @Serialize(StudentResponseDto)
  serialized(this: void): void {}
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor(new Reflector());

  function run(handler: keyof ProbeController, value: unknown) {
    const context = new ExecutionContextHost(
      [],
      ProbeController,
      ProbeController.prototype[handler],
    );
    return firstValueFrom(
      interceptor.intercept(context, { handle: () => of(value) }),
    );
  }

  it('wraps a value in data', async () => {
    expect(await run('plain', { id: 's1' })).toEqual({ data: { id: 's1' } });
  });

  it('wraps a paginated result in data and meta', async () => {
    const page = PaginatedResult.of([{ id: 's1' }], 1, 1, 20);

    expect(await run('plain', page)).toEqual({
      data: [{ id: 's1' }],
      meta: page.meta,
    });
  });

  it('leaves an empty result empty', async () => {
    expect(await run('plain', undefined)).toBeUndefined();
  });

  it('leaves a file untouched', async () => {
    const file = new StreamableFile(Buffer.from('%PDF'));

    expect(await run('plain', file)).toBe(file);
  });

  it('leaves a raw response untouched', async () => {
    expect(await run('raw', { status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('keeps only the fields the DTO exposes', async () => {
    const student = { id: 's1', firstName: 'Léa', passwordHash: 'x' };

    expect(await run('serialized', student)).toEqual({
      data: { id: 's1', firstName: 'Léa' },
    });
  });
});
