import type { MetadataRoute } from 'next';

// N-02, N-03 and the web app settings of the charter.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sènami',
    short_name: 'Sènami',
    description: 'Déclaration d’accidents bénins en milieu scolaire',
    lang: 'fr',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#2E2A4D',
    background_color: '#FFFFFF',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
