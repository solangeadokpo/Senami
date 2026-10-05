import { BadRequestException } from '@nestjs/common';
import { SenamiExpressAdapter } from './senami-express.adapter.js';

describe('SenamiExpressAdapter', () => {
  const adapter = new SenamiExpressAdapter();

  it('keeps a body parser SyntaxError as the cause', () => {
    const parseError = new SyntaxError('Unexpected end of JSON input');

    const mapped = adapter.mapException(parseError);

    expect(mapped).toBeInstanceOf(BadRequestException);
    expect(mapped).toHaveProperty('cause', parseError);
  });

  it('leaves any other error to the default mapping', () => {
    const error = new Error('boom');

    expect(adapter.mapException(error)).toBe(error);
  });
});
