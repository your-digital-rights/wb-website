import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Run intl middleware first
  const response = intlMiddleware(request);

  // Only apply CSP in production
  if (process.env.NODE_ENV === 'production') {
    // Use a permissive CSP that still locks down external domains but avoids nonce/strict-dynamic
    // which were blocking Next.js scripts from loading in previews.
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.js.stripe.com https://js.stripe.com https://m.stripe.network https://maps.googleapis.com https://*.googleapis.com https://www.googletagmanager.com https://*.googletagmanager.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https://*.stripe.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com https://www.googletagmanager.com https://*.google-analytics.com;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co https://maps.googleapis.com https://*.googleapis.com https://www.googletagmanager.com https://*.googletagmanager.com https://*.google-analytics.com;
      frame-src 'self' https://*.js.stripe.com https://js.stripe.com https://hooks.stripe.com https://vercel.live;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-csp-version', 'relaxed-v2');
  }

  return response;
}

export const config = {
  matcher: [
    // Skip all paths that should not be internationalized
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  ]
};
