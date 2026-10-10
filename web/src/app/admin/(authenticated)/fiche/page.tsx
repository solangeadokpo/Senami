import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@features/auth/api/require-role';
import { getEstablishment } from '@features/establishments/api/establishments.api';
import { IdentityForm } from '@features/establishments/components/identity-form';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Fiche et destinataires' };

/** The responsable's own establishment, as it heads each accident sheet. */
export default async function SheetPage() {
  const { establishment } = await requireRole(UserRole.RESPONSABLE);
  if (establishment === null) notFound();

  const detail = await getEstablishment(establishment.id);
  if (detail === null) notFound();
  return <IdentityForm detail={detail} />;
}
