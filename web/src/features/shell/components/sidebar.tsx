'use client';

import { Building2, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserMenu } from '@features/shell/components/user-menu';
import { isActiveItem, navItemsFor } from '@features/shell/utils/nav-items';
import type { ShellUser } from '@features/shell/utils/shell-user';
import { Logo } from '@shared/components/brand/logo';
import { UserRole } from '@shared/enums/user-role.enum';
import { cn } from '@shared/utils/cn';

const NAV_ITEM =
  'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-semibold transition-colors [&_svg]:size-5';

export function Sidebar({
  user,
  onClose,
}: {
  user: ShellUser;
  /** Mobile drawer only. */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

  return (
    <div className="flex h-full flex-col gap-5 bg-indigo-900 px-4 py-6 text-indigo-200">
      <div className="flex items-center justify-between px-2">
        <Logo variant="inverse" width={132} />
        {onClose === undefined ? null : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="grid size-10 place-items-center rounded-xl text-indigo-200 transition-colors hover:bg-indigo-800 hover:text-white"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <p className="-mt-3 px-2 text-xs text-indigo-300">
        {isSuperAdmin ? 'Super admin' : 'Espace établissement'}
      </p>

      {user.establishmentName === null ? null : (
        <div className="flex items-center gap-3 rounded-xl bg-indigo-800 p-3 text-white">
          <Building2 className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 text-sm font-bold">
            {user.establishmentName}
          </span>
        </div>
      )}

      <nav aria-label="Navigation principale" className="grid gap-1">
        {navItemsFor(user.role).map((item) => {
          const { label, href, isAvailable } = item;
          if (!isAvailable) {
            return (
              <span
                key={href}
                aria-disabled
                title="Bientôt disponible"
                className={cn(
                  NAV_ITEM,
                  'cursor-not-allowed text-indigo-300/50',
                )}
              >
                <item.icon aria-hidden />
                {label}
                <span className="sr-only"> (bientôt)</span>
              </span>
            );
          }
          const isActive = isActiveItem(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              {...(onClose === undefined ? {} : { onClick: onClose })}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                NAV_ITEM,
                isActive
                  ? 'before:rounded-r bg-white text-indigo-900 before:absolute before:inset-y-2.5 before:-left-4 before:w-1 before:bg-coral-300 [&_svg]:text-coral-500'
                  : 'hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="mt-auto rounded-xl bg-indigo-800 px-4 py-3 text-xs leading-relaxed text-indigo-200">
        {isSuperAdmin
          ? 'Aucune donnée d’accident n’est stockée : seulement établissements, comptes, abonnements et compteur.'
          : 'Les fiches ne sont pas stockées ici : elles arrivent en PDF dans la boîte mail de la direction.'}
      </p>
      <UserMenu user={user} />
    </div>
  );
}
