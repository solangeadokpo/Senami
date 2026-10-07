import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@features/auth/api/current-user.api';
import { AuthFlash } from '@features/auth/components/auth-flash';
import { AppShell } from '@features/shell/components/app-shell';
import { toUserRole } from '@features/shell/utils/shell-user';
import { SessionChannel } from '@shared/enums/session-channel.enum';
import { enumValue } from '@shared/utils/enum-value';

/** Every page under this group needs a back office session. */
export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  if (
    user === null ||
    enumValue(SessionChannel, user.channel) !== SessionChannel.BACKOFFICE
  )
    redirect('/connexion');

  return (
    <AppShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        role: toUserRole(user.role),
        establishmentName: user.establishment?.name ?? null,
      }}
    >
      {children}
      <AuthFlash />
    </AppShell>
  );
}
