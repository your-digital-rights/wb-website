/**
 * Google Consent Mode v2 Integration
 *
 * This module provides the consent mode default script and update functions
 * for integrating with Google Tag Manager.
 *
 * @see https://developers.google.com/tag-platform/security/guides/consent
 */

import type { CookieConsent } from './cookie-consent';

/**
 * Inline script to set default consent BEFORE GTM loads.
 * This must be injected into the <head> before the GTM script.
 *
 * Sets all consent types to 'denied' by default, then checks localStorage
 * to restore any previously saved consent preferences.
 */
export const GTAG_CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}

// Set default consent to denied for all types
gtag('consent', 'default', {
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'analytics_storage': 'denied',
  'functionality_storage': 'granted',
  'personalization_storage': 'denied',
  'security_storage': 'granted',
  'wait_for_update': 500
});

// Check if user has already given consent (from localStorage)
try {
  var stored = localStorage.getItem('wb_cookie_consent');
  if (stored) {
    var consent = JSON.parse(stored);
    gtag('consent', 'update', {
      'ad_storage': consent.marketing ? 'granted' : 'denied',
      'ad_user_data': consent.marketing ? 'granted' : 'denied',
      'ad_personalization': consent.marketing ? 'granted' : 'denied',
      'analytics_storage': consent.analytics ? 'granted' : 'denied',
      'personalization_storage': consent.marketing ? 'granted' : 'denied'
    });
  }
} catch (e) {
  // Ignore localStorage errors
}
`.trim();

/**
 * Update Google consent state based on user preferences.
 * Call this when the user accepts/changes cookie preferences.
 */
export function updateGtagConsent(consent: Pick<CookieConsent, 'analytics' | 'marketing'>): void {
  if (typeof window === 'undefined') return;

  // Ensure gtag function exists
  const w = window as typeof window & {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  };

  w.dataLayer = w.dataLayer || [];

  // Define gtag if not already defined
  if (!w.gtag) {
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer.push(args);
    };
  }

  w.gtag('consent', 'update', {
    'ad_storage': consent.marketing ? 'granted' : 'denied',
    'ad_user_data': consent.marketing ? 'granted' : 'denied',
    'ad_personalization': consent.marketing ? 'granted' : 'denied',
    'analytics_storage': consent.analytics ? 'granted' : 'denied',
    'personalization_storage': consent.marketing ? 'granted' : 'denied',
  });
}
