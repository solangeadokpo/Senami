import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Logo } from '@shared/components/brand/logo';

// Served on the back office host only: see src/proxy.ts.
export const metadata: Metadata = {
  title: { default: 'Back-office', template: '%s · Back-office Sènami' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted">
      <header className="border-b bg-background">
        <div className="flex h-16 items-center page-gutter">
          <Logo width={120} priority />
        </div>
      </header>
      <main className="flex-1 page-gutter py-8">{children}</main>
    </div>
  );
}
