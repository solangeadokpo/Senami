import 'server-only';
import { cookies, headers } from 'next/headers';
import { publicEnv } from '@config/public-env';
import { serverEnv } from '@config/server-env';
import { type ApiClient, createApiClient } from '@core/api/api-client';
import { SESSION_COOKIE } from '@core/api/session-cookie';

/**
 * The API as the signed-in user: Server Components, Server Actions and route
 * handlers. The browser never holds the session token in JavaScript.
 */
export const serverApi: ApiClient = createApiClient({
  baseUrl: `${serverEnv.API_URL}/api/v1`,
  headers: async () => {
    const session = (await cookies()).get(SESSION_COOKIE);
    const incoming = await headers();
    const forwardedFor = incoming.get('x-forwarded-for');
    const userAgent = incoming.get('user-agent');
    return {
      // The API checks the origin of every cookie-authenticated write.
      Origin: publicEnv.appUrl,
      // The visitor, not this server: the API audits and throttles by them.
      ...(forwardedFor === null ? {} : { 'X-Forwarded-For': forwardedFor }),
      ...(userAgent === null ? {} : { 'User-Agent': userAgent }),
      ...(session === undefined
        ? {}
        : { Cookie: `${SESSION_COOKIE}=${session.value}` }),
    };
  },
});
