import type { Metadata } from 'next';
import { InvitationFlow } from '@features/invitations/components/invitation-flow';
import { AuthBackdrop } from '@shared/components/brand/auth-backdrop';
import { AuthCard } from '@shared/components/brand/auth-card';

export const metadata: Metadata = { title: 'Activer mon compte' };

/** Public: the invitation token arrives after the # of the link. */
export default function InvitationPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-14">
      <AuthBackdrop />
      <AuthCard>
        <InvitationFlow />
      </AuthCard>
    </main>
  );
}
