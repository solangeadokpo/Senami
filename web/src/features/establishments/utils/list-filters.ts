import { EstablishmentStatus } from '@shared/enums/establishment-status.enum';
import { enumValue } from '@shared/utils/enum-value';

/** The list state, kept in the URL: a refresh or a shared link shows the same list. */
export interface ListFilters {
  search: string;
  city: string;
  status: EstablishmentStatus | undefined;
  page: number;
}

export const PAGE_SIZE = 20;

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? '';

export function filtersFromSearchParams(params: SearchParams): ListFilters {
  const page = Number.parseInt(first(params['page']), 10);
  return {
    search: first(params['q']),
    city: first(params['ville']),
    status: enumValue(EstablishmentStatus, first(params['statut'])),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** French keys, as users read them in the address bar; defaults left out. */
export function filtersToQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.search !== '') params.set('q', filters.search);
  if (filters.city !== '') params.set('ville', filters.city);
  if (filters.status !== undefined) params.set('statut', filters.status);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}
