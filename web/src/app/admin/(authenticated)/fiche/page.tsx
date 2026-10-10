import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireRole } from '@features/auth/api/require-role';
import { getEstablishment } from '@features/establishments/api/establishments.api';
import { IdentityForm } from '@features/establishments/components/identity-form';
import { getSheetRecipients } from '@features/sheet-recipients/api/sheet-recipients.api';
import { RecipientsForm } from '@features/sheet-recipients/components/recipients-form';
import { UserRole } from '@shared/enums/user-role.enum';

export const metadata: Metadata = { title: 'Fiche et destinataires' };

/** The responsable's own establishment: the sheet's header and recipients. */
export default async function SheetPage() {
  const { establishment } = await requireRole(UserRole.RESPONSABLE);
  if (establishment === null) notFound();

  const [detail, recipients] = await Promise.all([
    getEstablishment(establishment.id),
    getSheetRecipients(),
  ]);
  if (detail === null) notFound();
  return (
    <IdentityForm detail={detail}>
      <RecipientsForm
        initial={{
          to: recipients.to,
          cc: recipients.cc,
          bcc: recipients.bcc,
        }}
      />
    </IdentityForm>
  );
}
