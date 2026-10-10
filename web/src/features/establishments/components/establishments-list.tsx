'use client';

import { Building2, Plus, Search, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { EstablishmentPage } from '@features/establishments/api/establishments.api';
import {
  STATUS_LABELS,
  statusOf,
  subscriptionOf,
  typeLabel,
} from '@features/establishments/utils/labels';
import {
  type ListFilters,
  PAGE_SIZE,
  filtersToQuery,
} from '@features/establishments/utils/list-filters';
import { Badge } from '@shared/components/ui/badge';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Select } from '@shared/components/ui/select';
import { Skeleton } from '@shared/components/ui/skeleton';
import { EstablishmentStatus } from '@shared/enums/establishment-status.enum';
import { UserStatus } from '@shared/enums/user-status.enum';
import { enumValue } from '@shared/utils/enum-value';
import { formatDate } from '@shared/utils/format-date';

const SEARCH_DELAY_MS = 300;
const TH = 'px-5 py-4 text-left text-label text-slate-600 uppercase';

export function EstablishmentsList({
  page,
  cities,
  filters,
}: {
  page: EstablishmentPage;
  cities: string[];
  filters: ListFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.search);
  const firstRender = useRef(true);

  const go = (next: Partial<ListFilters>) =>
    startTransition(() => {
      router.replace(
        `${pathname}${filtersToQuery({ ...filters, page: 1, ...next })}`,
        { scroll: false },
      );
    });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(
      () => go({ search: search.trim() }),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typing only
  }, [search]);

  const tags = [
    ...(filters.search === ''
      ? []
      : [
          {
            label: `« ${filters.search} »`,
            clear: () => {
              setSearch('');
              go({ search: '' });
            },
          },
        ]),
    ...(filters.city === ''
      ? []
      : [{ label: filters.city, clear: () => go({ city: '' }) }]),
    ...(filters.status === undefined
      ? []
      : [
          {
            label: STATUS_LABELS[filters.status].label,
            clear: () => go({ status: undefined }),
          },
        ]),
  ];
  const from = (filters.page - 1) * PAGE_SIZE + 1;
  const to = Math.min(filters.page * PAGE_SIZE, page.total);
  const isFiltered = tags.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
            Établissements
          </h1>
          <p className="text-muted-foreground tabular-nums">
            {page.total} établissement{page.total > 1 ? 's' : ''}
            {isFiltered ? ' pour ces filtres' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/etablissements/nouveau">
            <Plus aria-hidden />
            Nouvel établissement
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-[1_1_280px]">
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un établissement ou l’e-mail d’un responsable"
            aria-label="Rechercher"
            leadingIcon={<Search />}
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            aria-label="Ville"
            value={filters.city}
            onChange={(event) => go({ city: event.target.value })}
          >
            <option value="">Toutes les villes</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <Select
            aria-label="Statut"
            value={filters.status ?? ''}
            onChange={(event) =>
              go({ status: enumValue(EstablishmentStatus, event.target.value) })
            }
          >
            <option value="">Tous les statuts</option>
            {Object.values(EstablishmentStatus).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {tags.length === 0 ? null : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 py-1 pr-1 pl-3 text-sm font-bold text-indigo-900"
            >
              {tag.label}
              <button
                type="button"
                onClick={tag.clear}
                aria-label={`Retirer le filtre ${tag.label}`}
                className="grid size-6 place-items-center rounded-full text-indigo-600 hover:bg-white"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className="overflow-hidden rounded-3xl border bg-white"
        aria-busy={isPending}
      >
        {page.items.length === 0 && !isPending ? (
          <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
              {isFiltered ? (
                <Search className="size-6" aria-hidden />
              ) : (
                <Building2 className="size-6" aria-hidden />
              )}
            </span>
            <h2 className="text-lg font-bold text-indigo-900">
              {isFiltered
                ? 'Aucun établissement ne correspond'
                : 'Aucun établissement pour l’instant'}
            </h2>
            <p className="max-w-[44ch] text-muted-foreground">
              {isFiltered
                ? 'Modifiez la recherche ou retirez des filtres pour voir plus d’établissements.'
                : 'Créez le premier établissement : son responsable recevra une invitation par e-mail.'}
            </p>
            {isFiltered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  go({ search: '', city: '', status: undefined });
                }}
              >
                Effacer les filtres
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full border-collapse text-sm max-lg:block">
            <thead className="max-lg:hidden">
              <tr className="border-b">
                <th className={TH}>Établissement</th>
                <th className={TH}>Responsable</th>
                <th className={TH}>Déclarations ce mois</th>
                <th className={TH}>Abonnement</th>
                <th className={TH}>Statut</th>
              </tr>
            </thead>
            <tbody className="max-lg:block">
              {isPending
                ? Array.from({ length: 4 }, (_, index) => (
                    <tr
                      key={index}
                      className="border-b border-slate-100 max-lg:grid max-lg:gap-2 max-lg:p-5"
                    >
                      {Array.from({ length: 5 }, (_column, cell) => (
                        <td key={cell} className="px-5 py-5 max-lg:p-0">
                          <Skeleton className="w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))
                : page.items.map((item) => <Row key={item.id} item={item} />)}
            </tbody>
          </table>
        )}
        {page.total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {from} à {to} sur {page.total}
            </span>
            <span className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 px-4"
                disabled={filters.page <= 1 || isPending}
                onClick={() => go({ ...filters, page: filters.page - 1 })}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                className="h-9 px-4"
                disabled={filters.page >= page.totalPages || isPending}
                onClick={() => go({ ...filters, page: filters.page + 1 })}
              >
                Suivant
              </Button>
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function Row({ item }: { item: EstablishmentPage['items'][number] }) {
  const status = statusOf(item.status);
  const subscription =
    item.subscription === null
      ? null
      : subscriptionOf(item.subscription.status);
  const isInvited =
    item.responsable !== null &&
    enumValue(UserStatus, item.responsable.status) === UserStatus.INVITED;
  const cell =
    'px-5 py-4 align-middle max-lg:p-0 max-lg:before:block max-lg:before:text-label max-lg:before:text-slate-500 max-lg:before:uppercase max-lg:before:content-[attr(data-label)]';

  return (
    <tr className="group relative border-b border-slate-100 transition-colors last:border-0 hover:bg-indigo-50 max-lg:grid max-lg:gap-2 max-lg:p-5">
      <td className={cell} data-label="Établissement">
        {/* The whole row opens the detail: the link stretches over it. */}
        <Link
          href={`/etablissements/${item.id}`}
          className="after:rounded-sm font-bold text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {item.name}
        </Link>
        {item.isDemo ? (
          <span className="ml-2">
            <Badge tone="neutral" hasDot={false}>
              Démo
            </Badge>
          </span>
        ) : null}
        <span className="block text-[0.8125rem] text-muted-foreground">
          {typeLabel(item.type)} · {item.city}
        </span>
      </td>
      <td className={cell} data-label="Responsable">
        {item.responsable === null ? (
          <span className="text-muted-foreground">Aucun</span>
        ) : (
          <>
            <span className="block font-bold">
              {item.responsable.firstName} {item.responsable.lastName}
            </span>
            <span className="block text-[0.8125rem] break-all text-muted-foreground">
              {item.responsable.email}
            </span>
            {isInvited ? (
              <span className="mt-1 inline-block">
                <Badge tone="info">Invitation envoyée</Badge>
              </span>
            ) : null}
          </>
        )}
      </td>
      <td className={cell} data-label="Déclarations ce mois">
        <span className="font-display text-base font-bold text-indigo-900 tabular-nums">
          {item.declarationsThisMonth}
        </span>
      </td>
      <td className={cell} data-label="Abonnement">
        {item.subscription === null || subscription === null ? (
          <span className="text-muted-foreground">Aucun</span>
        ) : (
          <>
            <Badge tone={subscription.tone}>{subscription.label}</Badge>
            {item.subscription.currentPeriodEnd === null ? null : (
              <span className="mt-1 block text-[0.8125rem] text-muted-foreground tabular-nums">
                Échéance{' '}
                {formatDate(new Date(item.subscription.currentPeriodEnd))}
              </span>
            )}
          </>
        )}
      </td>
      <td className={cell} data-label="Statut">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
    </tr>
  );
}
