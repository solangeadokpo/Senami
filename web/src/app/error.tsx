'use client';

import { Button } from '@shared/components/ui/button';

// T-13: name what failed and the action to take again, no apology.
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 page-gutter text-center">
      <h1 className="text-title text-indigo-900">
        La page n’a pas pu s’afficher
      </h1>
      <p className="text-muted-foreground">
        Rechargez la page dans un instant.
      </p>
      <Button onClick={reset}>Recharger la page</Button>
    </main>
  );
}
