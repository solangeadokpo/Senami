import type { Request, Response } from 'express';
import {
  REQUEST_ID_HEADER,
  requestIdMiddleware,
} from './request-id.middleware.js';

describe('requestIdMiddleware', () => {
  function run(incoming?: string): { requestId: unknown; echoed: unknown } {
    const request: Pick<Request, 'headers'> = {
      headers: incoming === undefined ? {} : { [REQUEST_ID_HEADER]: incoming },
    };
    const setHeader = vi.fn();
    const next = vi.fn();

    requestIdMiddleware(
      request,
      { setHeader } satisfies Pick<Response, 'setHeader'>,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    return {
      requestId: request.headers[REQUEST_ID_HEADER],
      echoed: setHeader.mock.calls[0]?.[1],
    };
  }

  it('keeps a valid incoming id and echoes it', () => {
    expect(run('client-id-1234')).toEqual({
      requestId: 'client-id-1234',
      echoed: 'client-id-1234',
    });
  });

  it('replaces an id that is unsafe to log', () => {
    const { requestId } = run('bad id\nwith newline');

    expect(requestId).not.toBe('bad id\nwith newline');
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates an id when none is given', () => {
    const { requestId, echoed } = run();

    expect(requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(echoed).toBe(requestId);
  });
});
