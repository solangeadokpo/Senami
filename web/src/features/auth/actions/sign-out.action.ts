'use server';

import { ApiError } from '@core/api/api-error';
import { signOut } from '@features/auth/api/backoffice-auth.api';
import {
  dropSessionCookie,
  setAuthFlash,
} from '@features/auth/api/session-cookie';

export async function signOutAction(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    // Already expired or revoked: the cookie goes anyway.
    if (!(error instanceof ApiError)) throw error;
  }
  await dropSessionCookie();
  await setAuthFlash({ kind: 'signed-out' });
}
