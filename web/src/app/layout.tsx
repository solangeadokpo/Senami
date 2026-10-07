import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { publicEnv } from '@config/public-env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: 'Sènami', template: '%s · Sènami' },
  description:
    'Déclarer un accident bénin à l’école depuis un téléphone ou une tablette. La fiche est transmise à la direction ; Sènami n’en conserve aucune copie.',
  applicationName: 'Sènami',
};

export const viewport: Viewport = {
  themeColor: '#2E2A4D',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
