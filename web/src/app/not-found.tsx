import Link from 'next/link';
import { Button } from '@shared/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground">
        Cette page n’existe pas ou a été déplacée.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </main>
  );
}
