import 'server-only';
import { cookies } from 'next/headers';
import { publicEnv } from '@config/public-env';
import { FLASH_COOKIE, type Flash } from '@shared/utils/flash';

const FLASH_SECONDS = 600;

/** A message for the next page, read once by FlashToast. No personal data. */
export async function setFlash(flash: Flash): Promise<void> {
  (await cookies()).set(FLASH_COOKIE, JSON.stringify(flash), {
    sameSite: 'lax',
    secure: new URL(publicEnv.appUrl).protocol === 'https:',
    path: '/',
    maxAge: FLASH_SECONDS,
  });
}
