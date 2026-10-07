import { type NextRequest, NextResponse } from 'next/server';
import { publicEnv } from '@config/public-env';
import { SESSION_COOKIE } from '@core/api/session-cookie';
import { resolveZone } from '@core/routing/zones';

const APP_HOST = new URL(publicEnv.appUrl).host;
const NOT_FOUND_PATH = '/_not-found';

export function proxy(request: NextRequest): NextResponse {
  const decision = resolveZone(
    request.headers.get('host'),
    request.nextUrl.pathname,
    APP_HOST,
    request.cookies.has(SESSION_COOKIE),
  );

  switch (decision.kind) {
    case 'site':
      return NextResponse.next();
    case 'sign-in':
      return NextResponse.redirect(new URL(decision.redirectTo, request.url));
    case 'not-found':
      return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
    case 'admin': {
      const url = request.nextUrl.clone();
      url.pathname = decision.rewriteTo;
      const response = NextResponse.rewrite(url);
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return response;
    }
  }
}

export const config = {
  // Not the API rewrite, the build assets nor the public files.
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
