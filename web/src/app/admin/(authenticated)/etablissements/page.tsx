import type { Metadata } from 'next';
import { requireRole } from '@features/auth/api/require-role';
import {
  listCities,
  listEstablishments,
} from '@features/establishments/api/establishments.api';
import { EstablishmentsList } from '@features/establishments/components/establishments-list';
import { filtersFromSearchParams } from '@features/establishments/utils/list-filters';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Établissements' };

export default async function EstablishmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(UserRole.SUPER_ADMIN);

  const filters = filtersFromSearchParams(await searchParams);
  const [page, cities] = await Promise.all([
    listEstablishments(filters),
    listCities(),
  ]);
  return <EstablishmentsList page={page} cities={cities} filters={filters} />;
}
