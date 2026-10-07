import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { publicEnv } from '@config/public-env';
import './globals.css';

// Downloaded at build time and served by the app: no request to Google.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: 'Senami', template: '%s · Senami' },
  description:
    'Déclarer un accident bénin à l’école en quelques minutes, depuis un téléphone ou une tablette.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
