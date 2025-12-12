# Analytics Events Documentation

This document describes the Google Analytics events implemented via GTM dataLayer in the WhiteBoar website.

## Overview

All events are pushed to `window.dataLayer` for GTM to process. Events follow GA4 ecommerce conventions where applicable.

**Important**: No PII (Personally Identifiable Information) is included in any events.

## Package Definitions

Package definitions are centralized in `src/lib/analytics.ts`:

| Package ID | Item Name | Category | Price | Currency |
|------------|-----------|----------|-------|----------|
| `fast_simple` | Fast & Simple | package | 35 | EUR |
| `custom_made` | Custom Made | package | - | - |

## Events

### 1. wb_select_item

**Purpose**: Track when a user shows genuine selection intent by clicking a package CTA.

**Trigger Locations**:
| Location | File | CTA Location Value |
|----------|------|-------------------|
| Hero CTA | `src/components/Hero.tsx` | `hero` |
| Navigation CTA (desktop) | `src/components/Navigation.tsx` | `nav` |
| Navigation CTA (mobile) | `src/components/Navigation.tsx` | `nav_mobile` |
| Pricing Card - Fast | `src/components/PricingTable.tsx` | `pricing_card` |
| Pricing Card - Custom | `src/components/PricingTable.tsx` | `pricing_card` |

**Payload**:
```javascript
{
  event: 'wb_select_item',
  ecommerce: {
    items: [{
      item_id: 'fast_simple' | 'custom_made',
      item_name: 'Fast & Simple' | 'Custom Made',
      item_category: 'package',
      price: 35 | undefined,
      currency: 'EUR' | undefined
    }]
  },
  cta_location: 'hero' | 'nav' | 'nav_mobile' | 'pricing_card'
}
```

**Deduplication**: In-memory Set prevents duplicate fires within the same session.

---

### 2. wb_begin_checkout

**Purpose**: Track when a user starts the onboarding checkout flow.

**Trigger Location**: Step 1 of onboarding loads (`src/app/[locale]/onboarding/step/[stepNumber]/page.tsx`)

**Payload**:
```javascript
{
  event: 'wb_begin_checkout',
  ecommerce: {
    items: [{
      item_id: 'fast_simple',
      item_name: 'Fast & Simple',
      item_category: 'package',
      price: 35,
      currency: 'EUR'
    }]
  },
  cta_location: 'onboarding_step_1'
}
```

**Deduplication**: In-memory Set prevents duplicate fires within the same session.

---

### 3. wb_onboarding_complete

**Purpose**: Track when a user completes all onboarding form steps (before payment).

**Trigger Location**: Step 14 (checkout) loads (`src/app/[locale]/onboarding/step/[stepNumber]/page.tsx`)

**Payload**:
```javascript
{
  event: 'wb_onboarding_complete',
  ecommerce: {
    items: [{
      item_id: 'fast_simple',
      item_name: 'Fast & Simple',
      item_category: 'package',
      price: 35,
      currency: 'EUR'
    }]
  }
}
```

**Deduplication**: In-memory Set prevents duplicate fires within the same session.

---

### 4. wb_purchase

**Purpose**: Track successful payment completion.

**Trigger Locations** (`src/components/onboarding/steps/Step14Checkout.tsx`):
- PaymentIntent success (regular payment)
- SetupIntent success ($0 invoice, payment method saved for future billing)
- Zero payment complete (100% discount)

**Payload**:
```javascript
{
  event: 'wb_purchase',
  ecommerce: {
    transaction_id: '<stripe_payment_intent_id>' | '<stripe_setup_intent_id>' | 'zero_payment_<submission_id>',
    value: <amount_paid>,
    currency: 'EUR',
    items: [{
      item_id: 'fast_simple',
      item_name: 'Fast & Simple',
      item_category: 'package',
      price: 35,
      currency: 'EUR'
    }]
  }
}
```

**Deduplication**:
- In-memory Set for current session
- sessionStorage persistence for page reloads
- `transaction_id` ensures uniqueness

---

### 5. wb_generate_lead

**Purpose**: Track successful custom software contact form submission.

**Trigger Location**: Form submission success (`src/components/CustomSoftwareForm.tsx`)

**Payload**:
```javascript
{
  event: 'wb_generate_lead',
  ecommerce: {
    items: [{
      item_id: 'custom_made',
      item_name: 'Custom Made',
      item_category: 'package'
    }]
  }
}
```

**Deduplication**: In-memory Set prevents duplicate fires within the same session.

---

## Funnels

### Funnel A: Fast & Simple
```
Homepage (wb_select_item)
    -> Onboarding Step 1 (wb_begin_checkout)
    -> Onboarding Step 14 (wb_onboarding_complete)
    -> Payment Success (wb_purchase)
```

### Funnel B: Custom Made
```
Homepage (wb_select_item)
    -> Custom Software Page
    -> Form Success (wb_generate_lead)
```

---

## Implementation Notes

### Deduplication Strategy

1. **In-memory Set**: Each event type maintains a Set of fired event keys
2. **sessionStorage**: Used for `wb_purchase` to survive page reloads
3. **transaction_id**: Unique identifier from Stripe for purchase events

### GTM Integration

Events are pushed to `window.dataLayer`. GTM is loaded via `@next/third-parties/google` in the layout. No additional GA scripts should be loaded directly - GTM is the only tag loader.

### Testing

To verify events in development:
1. Open browser DevTools
2. Type `window.dataLayer` in console
3. Look for events with `event: 'wb_*'`

Or use GTM Preview mode to see events in real-time.

---

## Files Reference

| File | Events |
|------|--------|
| `src/lib/analytics.ts` | All event functions and package definitions |
| `src/components/Hero.tsx` | `wb_select_item` |
| `src/components/Navigation.tsx` | `wb_select_item` |
| `src/components/PricingTable.tsx` | `wb_select_item` |
| `src/app/[locale]/onboarding/step/[stepNumber]/page.tsx` | `wb_begin_checkout`, `wb_onboarding_complete` |
| `src/components/onboarding/steps/Step14Checkout.tsx` | `wb_purchase` |
| `src/components/CustomSoftwareForm.tsx` | `wb_generate_lead` |
