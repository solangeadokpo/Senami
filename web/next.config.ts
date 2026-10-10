import type { NextConfig } from 'next';
import { validateEnvironment } from './src/config/env';

const env = validateEnvironment(process.env);
const isDevelopment = process.env.NODE_ENV === 'development';
const isHttps = new URL(env.NEXT_PUBLIC_SITE_URL).protocol === 'https:';

// Without nonces, so that the showcase pages stay static. Next.js needs
// 'unsafe-inline' for its scripts then; 'unsafe-eval' only for hot reload.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  ...(isHttps
    ? [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // A self-contained server for the Docker image: only the files it needs.
  output: 'standalone',
  // The build checks the application code only, as the backend does.
  typescript: { tsconfigPath: 'tsconfig.build.json' },
  poweredByHeader: false,
  // Next.js logs each Server Action with its arguments in development:
  // passwords, codes and tokens would land in the terminal.
  logging: { serverFunctions: false },
  reactStrictMode: true,
  // Off: in the back office the URL is not the file path (/connexion is
  // served by app/admin/connexion), which typed routes cannot express.
  typedRoutes: false,
  headers: () =>
    Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
  // The browser calls the API on the same origin: the session cookie stays
  // first-party and no CORS is involved.
  rewrites: () =>
    Promise.resolve([
      { source: '/api/:path*', destination: `${env.API_URL}/api/:path*` },
    ]),
};

export default nextConfig;
