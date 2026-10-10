import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Served on the back office host only: see src/proxy.ts.
export const metadata: Metadata = {
  title: { default: 'Back-office', template: '%s · Back-office Sènami' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
