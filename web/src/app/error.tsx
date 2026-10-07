'use client';

import { Button } from '@shared/components/ui/button';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="text-muted-foreground">
        Réessayez dans un instant. Si le problème persiste, contactez-nous.
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </main>
  );
}
