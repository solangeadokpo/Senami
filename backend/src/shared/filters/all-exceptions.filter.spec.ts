import { Logger } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host.js';
import type {
  ErrorMapper,
  ResolvedError,
} from '@shared/errors/error-mapper.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

const NOT_FOUND: ResolvedError = {
  status: 404,
  code: 'STUDENT_NOT_FOUND',
  message: 'Student not found',
  details: { studentId: 's1' },
  context: { secret: 'internal' },
};

function mapperFor(match: unknown, resolved: ResolvedError): ErrorMapper {
  return { map: (exception) => (exception === match ? resolved : undefined) };
}

describe('AllExceptionsFilter', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function respond(filter: AllExceptionsFilter, exception: unknown) {
    const json = vi.fn<(body: unknown) => void>();
    const response = {
      status: vi.fn<(code: number) => { json: typeof json }>(() => ({ json })),
    };
    const request = {
      method: 'GET',
      originalUrl: '/api/v1/students/s1?q=Martin',
      headers: { 'x-request-id': 'req-12345678' },
    };

    filter.catch(exception, new ExecutionContextHost([request, response]));

    return {
      status: response.status.mock.calls[0]?.[0],
      body: json.mock.calls[0]?.[0],
    };
  }

  it('answers with the first mapper that recognises the error', () => {
    const exception = new Error('not found');
    const filter = new AllExceptionsFilter([
      mapperFor('other', { status: 409, code: 'X', message: 'x' }),
      mapperFor(exception, NOT_FOUND),
      mapperFor(exception, { status: 500, code: 'Y', message: 'y' }),
    ]);

    const { status, body } = respond(filter, exception);

    expect(status).toBe(404);
    expect(body).toMatchObject({
      error: {
        status: 404,
        code: 'STUDENT_NOT_FOUND',
        message: 'Student not found',
        details: { studentId: 's1' },
        requestId: 'req-12345678',
        path: '/api/v1/students/s1',
      },
    });
    expect(body).toHaveProperty('error.timestamp');
  });

  it('never returns the context, and logs it', () => {
    const exception = new Error('not found');
    const filter = new AllExceptionsFilter([mapperFor(exception, NOT_FOUND)]);

    const { body } = respond(filter, exception);

    expect(JSON.stringify(body)).not.toContain('internal');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('internal'));
  });

  it('answers an unknown error with a 500 that hides its message', () => {
    const filter = new AllExceptionsFilter([]);

    const { status, body } = respond(filter, new Error('password=hunter2'));

    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(body).toMatchObject({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    expect(error).toHaveBeenCalled();
  });

  it('logs a security alert at error level whatever the status', () => {
    const exception = new Error('rls');
    const filter = new AllExceptionsFilter([
      mapperFor(exception, {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
        securityAlert: true,
      }),
    ]);

    respond(filter, exception);

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY'),
      expect.any(String),
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
