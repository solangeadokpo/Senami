import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { ApiError } from '@core/api/api-error';
import type { ApiSchemas } from '@core/api/api-types';
import { serverApi } from '@core/api/server-api';
import { SESSION_COOKIE } from '@core/api/session-cookie';

export type CurrentUser = ApiSchemas['MeResponseDto'];

/** The signed-in user, once per request; null without a valid session. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!(await cookies()).has(SESSION_COOKIE)) return null;
  try {
    return (await serverApi.request<CurrentUser>('/auth/me')).data;
  } catch (error) {
    // Expired, revoked, deactivated or suspended: signed out either way.
    if (error instanceof ApiError && [401, 403].includes(error.status)) {
      return null;
    }
    throw error;
  }
});
