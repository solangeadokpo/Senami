import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@features/auth/api/require-role';
import { getEstablishment } from '@features/establishments/api/establishments.api';
import { EstablishmentDetail } from '@features/establishments/components/establishment-detail';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Établissement' };

export default async function EstablishmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(UserRole.SUPER_ADMIN);

  const detail = await getEstablishment((await params).id);
  if (detail === null) notFound();
  return <EstablishmentDetail detail={detail} />;
}
