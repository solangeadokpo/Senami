import type { ReactNode } from 'react';
import { Logo } from '@shared/components/brand/logo';

/** The floating card of the sign-in pages (layout B). */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[460px] rounded-3xl bg-white px-5 py-8 shadow-[0_40px_80px_-32px_rgb(0_0_0/0.6)] motion-safe:animate-rise sm:px-9 sm:py-10">
      <div className="mb-6">
        <Logo width={150} priority />
      </div>
      {children}
    </div>
  );
}
