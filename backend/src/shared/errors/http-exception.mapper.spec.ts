import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  MethodNotAllowedException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionMapper } from './http-exception.mapper.js';

describe('HttpExceptionMapper', () => {
  const mapper = new HttpExceptionMapper();

  it.each([
    [new BadRequestException(), 'BAD_REQUEST'],
    [new UnauthorizedException(), 'UNAUTHENTICATED'],
    [new ForbiddenException(), 'FORBIDDEN'],
    [new MethodNotAllowedException(), 'METHOD_NOT_ALLOWED'],
    [new PayloadTooLargeException(), 'PAYLOAD_TOO_LARGE'],
    [
      new HttpException('slow down', HttpStatus.TOO_MANY_REQUESTS),
      'RATE_LIMITED',
    ],
    [new ServiceUnavailableException(), 'SERVICE_UNAVAILABLE'],
    [new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT), 'HTTP_ERROR'],
  ])('maps %s to its generic code', (exception, code) => {
    const resolved = mapper.map(exception);

    expect(resolved?.status).toBe(exception.getStatus());
    expect(resolved?.code).toBe(code);
  });

  it('maps a not found exception to ROUTE_NOT_FOUND', () => {
    expect(mapper.map(new NotFoundException('Cannot GET /x'))).toEqual({
      status: 404,
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
    });
  });

  it('maps a JSON parse failure to MALFORMED_JSON', () => {
    const exception = new BadRequestException('Unexpected token', {
      cause: new SyntaxError('Unexpected token'),
    });

    expect(mapper.map(exception)?.code).toBe('MALFORMED_JSON');
  });

  it('turns a custom object payload into details', () => {
    const exception = new ServiceUnavailableException({ database: 'down' });

    expect(mapper.map(exception)?.details).toEqual({ database: 'down' });
  });

  it('ignores an error that is not an HTTP exception', () => {
    expect(mapper.map(new Error('boom'))).toBeUndefined();
  });
});
