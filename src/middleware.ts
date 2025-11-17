import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Run intl middleware first
  const response = intlMiddleware(request);

  // Only apply CSP in production
  if (process.env.NODE_ENV === 'production') {
    // Generate nonce for CSP
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

    // Build CSP header with nonce, strict-dynamic, and unsafe-eval (required by Stripe and Google Maps)
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' https://*.js.stripe.com https://js.stripe.com https://m.stripe.network https://maps.googleapis.com https://*.googleapis.com 'sha256-e357n1PxCJ8d03/QCSKaHFmHF1JADyvSHdSfshxM494=' 'sha256-5DA+a07wxWmEka9IdoWjSPVHb17Cp5284/lJzfbl8KA=' 'sha256-/5Guo2nzv5n/w6ukZpOBZOtTJBJPSkJ6mhHpnBgm3Ls=' 'sha256-7PZaH7TzFg4JdT5xJguN7Och6VcMcP1LW4N3fQ936Fs=' 'sha256-MqH8JJslY2fF2bGYY1rZlpCNrRCnWKRzrrDefixUJTI=' 'sha256-ZswfTY7H35rbv8WC7NXBoiC7WNu86vSzCDChNWwZZDM=';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https://*.stripe.com https://maps.googleapis.com https://*.googleapis.com https://*.gstatic.com;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co https://maps.googleapis.com https://*.googleapis.com;
      frame-src 'self' https://*.js.stripe.com https://js.stripe.com https://hooks.stripe.com https://vercel.live;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    // Add CSP and nonce headers
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('x-nonce', nonce);
  }

  return response;
}

export const config = {
  matcher: [
    // Skip all paths that should not be internationalized
    '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
  ]
};
