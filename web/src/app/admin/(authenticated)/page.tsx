import type { Metadata } from 'next';
import { getCurrentUser } from '@features/auth/api/current-user.api';
import { DashboardPlaceholder } from '@features/shell/components/dashboard-placeholder';
import { toUserRole } from '@features/shell/utils/shell-user';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default async function DashboardPage() {
  // Cached: the layout has already loaded it for this request.
  const user = await getCurrentUser();
  if (user === null) return null;

  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-[1.625rem] font-bold tracking-tight text-indigo-900">
          Tableau de bord
        </h1>
        <p className="text-muted-foreground">
          Bonjour {user.firstName} {user.lastName}.
        </p>
      </div>
      <DashboardPlaceholder role={toUserRole(user.role)} />
    </>
  );
}
