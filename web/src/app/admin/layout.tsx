import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Served on the back office host only: see src/proxy.ts.
export const metadata: Metadata = {
  title: { default: 'Back office', template: '%s · Back office Senami' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-muted">
      <header className="border-b bg-background">
        <div className="flex h-14 items-center px-6 font-semibold">
          Senami · Back office
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
