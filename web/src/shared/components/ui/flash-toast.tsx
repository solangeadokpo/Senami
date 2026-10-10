'use client';

import { useEffect, useState } from 'react';
import { Toast } from '@shared/components/ui/toast';
import { FLASH_COOKIE, describeFlash, readFlash } from '@shared/utils/flash';

/** Shows, once, the message a Server Action left for this page. */
export function FlashToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read and cleared inside the timer: the effect may run twice in
    // development, and only the timer that fires may consume the flash.
    // After the first paint, too, so that the toast slides in.
    const timer = setTimeout(() => {
      const flash = readFlash(document.cookie);
      if (flash === null) return;
      document.cookie = `${FLASH_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
      setMessage(describeFlash(flash));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return <Toast message={message} />;
}
