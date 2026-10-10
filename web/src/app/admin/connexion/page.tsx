import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@features/auth/api/current-user.api';
import { AuthBackdrop } from '@shared/components/brand/auth-backdrop';
import { FlashToast } from '@shared/components/ui/flash-toast';
import { SignInFlow } from '@features/auth/components/sign-in-flow';

export const metadata: Metadata = { title: 'Connexion' };

export default async function SignInPage() {
  if ((await getCurrentUser()) !== null) redirect('/');

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-14">
      <AuthBackdrop />
      <SignInFlow />
      <FlashToast />
    </main>
  );
}
