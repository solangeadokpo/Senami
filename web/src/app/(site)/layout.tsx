import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@shared/components/brand/logo';

// Showcase register: white dominant, sharp corners, a coral rule opens each
// content block (charter, "surfaces de l'identité").
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-20 max-w-content items-center page-gutter">
          <Link href="/" aria-label="Sènami, accueil">
            <Logo width={140} priority />
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto max-w-content page-gutter py-8 text-mention text-muted-foreground">
          Aucune copie des fiches n’est conservée par Sènami.
        </div>
      </footer>
    </div>
  );
}
