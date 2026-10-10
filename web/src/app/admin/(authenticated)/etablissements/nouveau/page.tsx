import type { Metadata } from 'next';
import { requireRole } from '@features/auth/api/require-role';
import { CreationWizard } from '@features/establishments/components/creation-wizard';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Nouvel établissement' };

export default async function NewEstablishmentPage() {
  await requireRole(UserRole.SUPER_ADMIN);

  return <CreationWizard />;
}
