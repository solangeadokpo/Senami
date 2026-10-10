'use client';

import { Menu } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Sidebar } from '@features/shell/components/sidebar';
import type { ShellUser } from '@features/shell/utils/shell-user';
import { cn } from '@shared/utils/cn';

/** Sidebar on wide screens, a drawer under 1024 px. */
export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isDrawerOpen]);

  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside
        className="sticky top-0 hidden h-dvh lg:block"
        aria-label="Navigation du back-office"
      >
        <Sidebar user={user} />
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-indigo-950/45 transition-opacity lg:hidden',
          isDrawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden
      />
      <aside
        id="mobile-navigation"
        aria-label="Navigation du back-office"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-[272px] transition-transform duration-300 lg:hidden',
          isDrawerOpen
            ? 'translate-x-0 shadow-[0_12px_32px_-12px_rgb(46_42_77/0.5)]'
            : '-translate-x-full',
        )}
        inert={!isDrawerOpen}
      >
        <Sidebar user={user} onClose={() => setIsDrawerOpen(false)} />
      </aside>

      <div className="min-w-0">
        <div className="flex items-center px-5 pt-6 sm:px-8 lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Ouvrir le menu"
            aria-controls="mobile-navigation"
            aria-expanded={isDrawerOpen}
            className="grid size-11 place-items-center rounded-xl border bg-white text-indigo-900 transition-colors hover:bg-indigo-50"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
        <main className="grid content-start gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
