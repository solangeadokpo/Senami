import 'server-only';
import { cookies } from 'next/headers';
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
    return {
      // The API checks the origin of every cookie-authenticated write.
      Origin: publicEnv.appUrl,
      ...(session === undefined
        ? {}
        : { Cookie: `${SESSION_COOKIE}=${session.value}` }),
    };
  },
});
