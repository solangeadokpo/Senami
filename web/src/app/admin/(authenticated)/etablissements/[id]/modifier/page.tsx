import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@features/auth/api/require-role';
import { getEstablishment } from '@features/establishments/api/establishments.api';
import { EstablishmentEditForm } from '@features/establishments/components/establishment-edit-form';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Modifier l’établissement' };

export default async function EditEstablishmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(UserRole.SUPER_ADMIN);

  const detail = await getEstablishment((await params).id);
  if (detail === null) notFound();
  return <EstablishmentEditForm detail={detail} />;
}
