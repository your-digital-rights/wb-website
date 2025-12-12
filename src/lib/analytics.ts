/**
 * Analytics utilities for Google Tag Manager dataLayer events
 *
 * Events are pushed to window.dataLayer for GTM to forward to GA4.
 * No PII is ever included in events.
 */

// Package item definitions - single source of truth
export const ANALYTICS_ITEMS = {
  fast_simple: {
    item_id: 'fast_simple',
    item_name: 'Fast & Simple',
    item_category: 'package',
    price: 35,
    currency: 'EUR'
  },
  custom_made: {
    item_id: 'custom_made',
    item_name: 'Custom Made',
    item_category: 'package'
    // price and currency omitted as not known upfront
  }
} as const

export type PackageId = keyof typeof ANALYTICS_ITEMS
export type CtaLocation = 'hero' | 'pricing_card' | 'comparison_table' | 'footer' | 'custom_software_form' | 'onboarding_step_1' | 'nav' | 'nav_mobile'

interface AnalyticsItem {
  item_id: string
  item_name: string
  item_category: string
  price?: number
  currency?: string
}

// Track which events have been fired to prevent duplicates
const firedEvents = new Set<string>()

// Track purchase transaction IDs to prevent duplicate purchase events
const firedTransactionIds = new Set<string>()

/**
 * Push an event to the dataLayer
 * Events are only pushed once per unique key (if key is provided)
 */
function pushToDataLayer(event: Record<string, unknown>, dedupeKey?: string): boolean {
  if (typeof window === 'undefined') return false

  // Deduplicate if key provided
  if (dedupeKey) {
    if (firedEvents.has(dedupeKey)) {
      return false
    }
    firedEvents.add(dedupeKey)
  }

  // Ensure dataLayer exists
  ;(window as any).dataLayer = (window as any).dataLayer || []
  ;(window as any).dataLayer.push(event)

  return true
}

/**
 * Get current language from document
 */
function getLanguage(): 'en' | 'it' {
  if (typeof document === 'undefined') return 'en'
  const lang = document.documentElement.lang
  return lang === 'it' ? 'it' : 'en'
}

/**
 * wb_select_item - Package click on homepage
 * Fire when user clicks a package card or CTA
 */
export function trackSelectItem(
  packageId: PackageId,
  ctaLocation: CtaLocation
): void {
  const item = ANALYTICS_ITEMS[packageId]
  const dedupeKey = `select_item_${packageId}_${ctaLocation}`

  pushToDataLayer({
    event: 'wb_select_item',
    item_list_id: 'homepage_packages',
    item_list_name: 'Homepage Packages',
    items: [item as AnalyticsItem],
    cta_location: ctaLocation,
    language: getLanguage()
  }, dedupeKey)
}

/**
 * wb_begin_checkout - Onboarding start for Fast & Simple
 * Fire when the first onboarding screen is shown
 */
export function trackBeginCheckout(ctaLocation?: CtaLocation): void {
  const item = ANALYTICS_ITEMS.fast_simple

  pushToDataLayer({
    event: 'wb_begin_checkout',
    items: [item as AnalyticsItem],
    value: item.price,
    currency: item.currency,
    ...(ctaLocation && { cta_location: ctaLocation }),
    language: getLanguage()
  }, 'begin_checkout')
}

/**
 * wb_onboarding_complete - Onboarding complete for Fast & Simple
 * Fire when user reaches the completion confirmation screen
 */
export function trackOnboardingComplete(): void {
  const item = ANALYTICS_ITEMS.fast_simple

  pushToDataLayer({
    event: 'wb_onboarding_complete',
    items: [item as AnalyticsItem],
    language: getLanguage()
  }, 'onboarding_complete')
}

/**
 * wb_purchase - Payment success for Fast & Simple
 * Fire only on confirmed payment success
 * Deduplicated by transaction_id to prevent reload duplicates
 */
export function trackPurchase(
  transactionId: string,
  value: number = 35,
  currency: string = 'EUR'
): boolean {
  if (!transactionId) return false

  // Check if this transaction was already tracked
  if (firedTransactionIds.has(transactionId)) {
    return false
  }
  firedTransactionIds.add(transactionId)

  // Also persist to sessionStorage for reload protection
  if (typeof sessionStorage !== 'undefined') {
    const key = `wb_purchase_${transactionId}`
    if (sessionStorage.getItem(key)) {
      return false
    }
    sessionStorage.setItem(key, '1')
  }

  const item = ANALYTICS_ITEMS.fast_simple

  return pushToDataLayer({
    event: 'wb_purchase',
    transaction_id: transactionId,
    value,
    currency,
    items: [item as AnalyticsItem],
    language: getLanguage()
  })
}

/**
 * wb_generate_lead - Custom Made lead form success
 * Fire after the contact form is successfully submitted
 */
export function trackGenerateLead(): void {
  pushToDataLayer({
    event: 'wb_generate_lead',
    method: 'contact_form',
    lead_type: 'custom_made',
    cta_location: 'custom_software_form',
    language: getLanguage()
  }, 'generate_lead_custom_software')
}

/**
 * Reset fired events tracking (useful for testing)
 */
export function resetAnalyticsTracking(): void {
  firedEvents.clear()
  firedTransactionIds.clear()
}
