'use client';

// Replaces the root layout when it fails: it must render its own document.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <main
          style={{
            fontFamily: 'system-ui',
            padding: '4rem 1rem',
            textAlign: 'center',
          }}
        >
          <h1>Une erreur est survenue</h1>
          <button type="button" onClick={reset}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
