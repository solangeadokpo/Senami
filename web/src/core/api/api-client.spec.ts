import { createApiClient } from './api-client';
import { API_UNAVAILABLE, ApiError, UNEXPECTED_RESPONSE } from './api-error';

const BASE_URL = 'http://api.test/api/v1';

function respond(status: number, body?: unknown, raw?: string) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetchStub: typeof fetch = (input, init) => {
    calls.push({
      url: input instanceof Request ? input.url : input.toString(),
      init,
    });
    return Promise.resolve(
      new Response(raw ?? (body === undefined ? null : JSON.stringify(body)), {
        status,
      }),
    );
  };
  return { calls, fetch: fetchStub };
}

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  const caught = await promise.then(
    () => undefined,
    (error: unknown) => error,
  );
  if (!(caught instanceof ApiError)) throw new Error('no ApiError thrown');
  return caught;
}

describe('createApiClient', () => {
  it('returns the data and the meta of the envelope', async () => {
    const stub = respond(200, { data: [{ id: 1 }], meta: { total: 1 } });
    const client = createApiClient({ baseUrl: BASE_URL, fetch: stub.fetch });

    await expect(client.request('/students')).resolves.toMatchObject({
      data: [{ id: 1 }],
      meta: { total: 1 },
    });
    expect(stub.calls[0]?.url).toBe(`${BASE_URL}/students`);
  });

  it('sends a JSON body and the configured headers', async () => {
    const stub = respond(200, { data: null });
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: stub.fetch,
      headers: () => ({ Origin: 'http://app.test' }),
    });

    await client.request('/auth/logout', {
      method: 'POST',
      body: { all: true },
    });

    const init = stub.calls[0]?.init;
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"all":true}');
    expect(init?.cache).toBe('no-store');
    expect(init?.headers).toMatchObject({
      Origin: 'http://app.test',
      'Content-Type': 'application/json',
    });
  });

  it('accepts an empty 204', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: respond(204).fetch,
    });

    await expect(
      client.request('/sessions/1', { method: 'DELETE' }),
    ).resolves.toMatchObject({ data: undefined });
  });

  it('exposes the response headers, such as a session cookie', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: () =>
        Promise.resolve(
          new Response(JSON.stringify({ data: null }), {
            status: 200,
            headers: { 'Set-Cookie': 'senami_session=abc; Path=/; HttpOnly' },
          }),
        ),
    });

    const { headers } = await client.request('/auth/backoffice/totp/verify');

    expect(headers.getSetCookie()).toEqual([
      'senami_session=abc; Path=/; HttpOnly',
    ]);
  });

  it('turns the error body into an ApiError', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: respond(422, {
        error: {
          status: 422,
          code: 'VALIDATION_FAILED',
          message: 'Invalid body',
          fields: [
            { field: 'email', constraint: 'isEmail', message: 'bad' },
            'not a field',
          ],
          requestId: 'r1',
          timestamp: '2026-10-07T08:00:00.000Z',
          path: '/api/v1/auth/backoffice/login',
        },
      }).fetch,
    });

    const error = await errorOf(client.request('/auth/backoffice/login'));

    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'Invalid body',
      requestId: 'r1',
      fields: [{ field: 'email', constraint: 'isEmail', message: 'bad' }],
    });
  });

  it('reports a body that is not the API envelope', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: respond(502, undefined, '<html>Bad gateway</html>').fetch,
    });

    const error = await errorOf(client.request('/auth/me'));

    expect(error).toMatchObject({ status: 502, code: UNEXPECTED_RESPONSE });
  });

  it('reports an unreachable API', async () => {
    const client = createApiClient({
      baseUrl: BASE_URL,
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    });

    const error = await errorOf(client.request('/auth/me'));

    expect(error).toMatchObject({ status: 503, code: API_UNAVAILABLE });
  });
});
