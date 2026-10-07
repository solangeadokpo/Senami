import Link from 'next/link';
import { Button } from '@shared/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 page-gutter text-center">
      <h1 className="text-title text-indigo-900">Page introuvable</h1>
      <p className="text-muted-foreground">
        Cette page n’existe pas ou a été déplacée.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Revenir à l’accueil</Link>
      </Button>
    </main>
  );
}
