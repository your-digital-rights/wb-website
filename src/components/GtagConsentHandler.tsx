'use client';

import { useEffect } from 'react';
import { updateGtagConsent } from '@/lib/gtag-consent';
import type { CookieConsent } from '@/lib/cookie-consent';

/**
 * Client component that listens for cookie consent changes
 * and updates Google's consent state accordingly.
 *
 * This component should be rendered in the layout to ensure
 * consent updates are handled on all pages.
 */
export function GtagConsentHandler() {
  useEffect(() => {
    const handleConsentChange = (event: CustomEvent<CookieConsent>) => {
      const consent = event.detail;
      updateGtagConsent({
        analytics: consent.analytics,
        marketing: consent.marketing,
      });
    };

    // Listen for consent changes
    window.addEventListener(
      'cookieConsentChange',
      handleConsentChange as EventListener
    );

    return () => {
      window.removeEventListener(
        'cookieConsentChange',
        handleConsentChange as EventListener
      );
    };
  }, []);

  // This component doesn't render anything
  return null;
}
