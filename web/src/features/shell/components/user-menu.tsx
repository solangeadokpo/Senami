'use client';

import { LoaderCircle, LogOut } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { signOutAction } from '@features/auth/actions/sign-out.action';
import { goToSignIn } from '@features/auth/utils/sign-in-navigation';
import {
  type ShellUser,
  initialsOf,
  roleLabel,
} from '@features/shell/utils/shell-user';
import { cn } from '@shared/utils/cn';

function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          goToSignIn();
        })
      }
      role="menuitem"
      aria-busy={pending || undefined}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-error transition-colors hover:bg-error-surface"
    >
      {pending ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
      ) : (
        <LogOut className="size-5" aria-hidden />
      )}
      {pending ? 'Déconnexion…' : 'Se déconnecter'}
    </button>
  );
}

export function UserMenu({ user }: { user: ShellUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div ref={wrapper} className="relative">
      {isOpen ? (
        <div
          role="menu"
          className="absolute inset-x-0 bottom-[calc(100%+8px)] grid gap-1 rounded-2xl bg-white p-2 text-foreground shadow-[0_12px_32px_-12px_rgb(46_42_77/0.28)] motion-safe:animate-appear"
        >
          <SignOutButton />
        </div>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl p-2 text-left text-white transition-colors hover:bg-indigo-800',
          isOpen && 'bg-indigo-800',
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-coral-300 font-display text-sm font-bold text-indigo-900">
          {initialsOf(user)}
        </span>
        <span className="grid min-w-0">
          <span className="truncate text-sm font-bold">
            {user.firstName} {user.lastName}
          </span>
          <span className="truncate text-xs text-indigo-300">
            {roleLabel(user.role)}
          </span>
        </span>
      </button>
    </div>
  );
}
