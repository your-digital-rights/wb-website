/**
 * Stripe Test Setup Utilities
 * Ensures test coupons exist and provides price fetching
 */

import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import path from 'path'

function createStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    const envPath = path.resolve(process.cwd(), '.env')
    dotenv.config({ path: envPath })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe E2E fixtures. Set it in your environment or .env file.')
  }

  return new Stripe(secretKey, {
    apiVersion: '2025-09-30.clover'
  })
}

const stripe = createStripeClient()

/**
 * Ensures test coupons exist in Stripe test mode
 * Creates them if missing, skips if already exist
 */
export type CouponIdSet = {
  tenPercent: string
  twentyPercent: string
  fiftyPercentThreeMonths: string
}

function sanitizeSuffix(suffix?: string): string {
  if (!suffix) return ''
  const trimmed = suffix.trim()
  if (!trimmed) return ''
  return '_' + trimmed.replace(/[^A-Za-z0-9_]/g, '_')
}

export function getTestCouponIds(suffix?: string): CouponIdSet {
  const normalized = sanitizeSuffix(suffix)
  return {
    tenPercent: `E2E_TEST_10${normalized}`,
    twentyPercent: `E2E_TEST_20${normalized}`,
    fiftyPercentThreeMonths: `E2E_TEST_50_3MO${normalized}`
  }
}

export async function ensureTestCouponsExist(ids: CouponIdSet = getTestCouponIds()) {
  const coupons = [
    {
      id: ids.tenPercent,
      percent_off: 10,
      duration: 'forever' as const,
      name: `E2E Test 10% Forever ${ids.tenPercent}`.slice(0, 40)
    },
    {
      id: ids.twentyPercent,
      percent_off: 20,
      duration: 'forever' as const,
      name: `E2E Test 20% Forever ${ids.twentyPercent}`.slice(0, 40)
    },
    {
      id: ids.fiftyPercentThreeMonths,
      percent_off: 50,
      duration: 'repeating' as const,
      duration_in_months: 3,
      name: `E2E Test 50% for 3 Months ${ids.fiftyPercentThreeMonths}`.slice(0, 40)
    }
  ]

  for (const couponData of coupons) {
    try {
      // Try to retrieve existing coupon
      await stripe.coupons.retrieve(couponData.id)
      console.log(`✓ Coupon ${couponData.id} already exists`)
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        // Create if doesn't exist
        await stripe.coupons.create(couponData)
        console.log(`✓ Created coupon ${couponData.id}`)
      } else {
        throw error
      }
    }
  }
}

/**
 * Gets actual Stripe prices to validate UI displays
 */
export async function getStripePrices() {
  const basePrice = await stripe.prices.retrieve(
    process.env.STRIPE_BASE_PACKAGE_PRICE_ID!
  )
  const addonPrice = await stripe.prices.retrieve(
    process.env.STRIPE_LANGUAGE_ADDON_PRICE_ID!
  )

  return {
    base: basePrice.unit_amount!, // cents
    addon: addonPrice.unit_amount!, // cents
    currency: basePrice.currency
  }
}

export type DiscountScenarioCoupons = {
  partialOnce: string
  partialForever: string
  partialRepeating: string
  fullOnce: string
  fullForever: string
}

export type DiscountScenarioPromoCodes = {
  partialOnce: string
  partialForever: string
  partialRepeating: string
  fullOnce: string
  fullForever: string
}

export function getDiscountScenarioCouponIds(suffix?: string): DiscountScenarioCoupons {
  const normalized = sanitizeSuffix(suffix)
  return {
    partialOnce: `E2E_PARTIAL_ONCE${normalized}`,
    partialForever: `E2E_PARTIAL_FOREVER${normalized}`,
    partialRepeating: `E2E_PARTIAL_REPEAT${normalized}`,
    fullOnce: `E2E_FULL_ONCE${normalized}`,
    fullForever: `E2E_FULL_FOREVER${normalized}`
  }
}

export function getDiscountScenarioPromoCodes(suffix?: string): DiscountScenarioPromoCodes {
  const normalized = sanitizeSuffix(suffix)
  return {
    partialOnce: `CLAUDE1${normalized}`,
    partialForever: `E2E_FOREVER${normalized}`,
    partialRepeating: `E2E_REPEAT${normalized}`,
    fullOnce: `E2E_FREE_ONCE${normalized}`,
    fullForever: `E2E_FREE_FOREVER${normalized}`
  }
}

let cachedBaseProductId: string | null = null

async function getBaseProductId(): Promise<string> {
  if (cachedBaseProductId) {
    return cachedBaseProductId
  }
  const basePriceId = process.env.STRIPE_BASE_PACKAGE_PRICE_ID
  if (!basePriceId) {
    throw new Error('STRIPE_BASE_PACKAGE_PRICE_ID is required for discount scenario coupons.')
  }
  const basePrice = await stripe.prices.retrieve(basePriceId)
  const productId = typeof basePrice.product === 'string'
    ? basePrice.product
    : basePrice.product?.id
  if (!productId) {
    throw new Error('Base package product ID not found for discount scenario coupons.')
  }
  cachedBaseProductId = productId
  return productId
}

export async function ensureDiscountScenarioCouponsExist(ids: DiscountScenarioCoupons = getDiscountScenarioCouponIds()) {
  const baseProductId = await getBaseProductId()
  const coupons: Stripe.CouponCreateParams[] = [
    {
      id: ids.partialOnce,
      percent_off: 50,
      duration: 'once',
      applies_to: { products: [baseProductId] },
      name: `E2E Partial Once ${ids.partialOnce}`.slice(0, 40)
    },
    {
      id: ids.partialForever,
      percent_off: 25,
      duration: 'forever',
      applies_to: { products: [baseProductId] },
      name: `E2E Partial Forever ${ids.partialForever}`.slice(0, 40)
    },
    {
      id: ids.partialRepeating,
      percent_off: 30,
      duration: 'repeating',
      duration_in_months: 3,
      applies_to: { products: [baseProductId] },
      name: `E2E Partial Repeat ${ids.partialRepeating}`.slice(0, 40)
    },
    {
      id: ids.fullOnce,
      percent_off: 100,
      duration: 'once',
      applies_to: { products: [baseProductId] },
      name: `E2E Full Once ${ids.fullOnce}`.slice(0, 40)
    },
    {
      id: ids.fullForever,
      percent_off: 100,
      duration: 'forever',
      applies_to: { products: [baseProductId] },
      name: `E2E Full Forever ${ids.fullForever}`.slice(0, 40)
    }
  ]

  for (const couponData of coupons) {
    try {
      await stripe.coupons.retrieve(couponData.id!)
      console.log(`✓ Coupon ${couponData.id} already exists`)
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        await stripe.coupons.create(couponData)
        console.log(`✓ Created coupon ${couponData.id}`)
      } else {
        throw error
      }
    }
  }
}

export async function ensureDiscountScenarioPromoCodesExist(
  promoCodes: DiscountScenarioPromoCodes,
  coupons: DiscountScenarioCoupons
) {
  const mappings = [
    { code: promoCodes.partialOnce, coupon: coupons.partialOnce },
    { code: promoCodes.partialForever, coupon: coupons.partialForever },
    { code: promoCodes.partialRepeating, coupon: coupons.partialRepeating },
    { code: promoCodes.fullOnce, coupon: coupons.fullOnce },
    { code: promoCodes.fullForever, coupon: coupons.fullForever }
  ]

  for (const mapping of mappings) {
    const existing = await stripe.promotionCodes.list({
      code: mapping.code,
      limit: 1
    })
    if (existing.data.length > 0) {
      console.log(`✓ Promotion code ${mapping.code} already exists`)
      continue
    }
    // New Stripe API structure requires promotion object with type
    await stripe.promotionCodes.create({
      promotion: {
        type: 'coupon',
        coupon: mapping.coupon
      },
      code: mapping.code,
      active: true
    })
    console.log(`✓ Created promotion code ${mapping.code}`)
  }
}

/**
 * Coupon details for test assertions
 */
export interface CouponDetails {
  id: string
  percentOff: number
  duration: 'once' | 'forever' | 'repeating'
  durationInMonths?: number
  appliesToProducts?: string[]
}

/**
 * Retrieves coupon details from Stripe for test assertions
 */
export async function getCouponDetails(couponId: string): Promise<CouponDetails> {
  const coupon = await stripe.coupons.retrieve(couponId)
  return {
    id: coupon.id,
    percentOff: coupon.percent_off ?? 0,
    duration: coupon.duration as 'once' | 'forever' | 'repeating',
    durationInMonths: coupon.duration_in_months ?? undefined,
    appliesToProducts: coupon.applies_to?.products ?? undefined
  }
}

/**
 * Expected pricing calculations for discount scenarios
 * These functions calculate the expected amounts based on coupon properties
 */
export interface ExpectedPricing {
  /** Amount due today (first payment) */
  dueToday: number
  /** Recurring monthly amount (after discount period ends for once/repeating) */
  recurringAmount: number
  /** Discount amount shown in UI */
  discountAmount: number
  /** Subtotal before discount */
  subtotal: number
  /** Description of what the recurring text should indicate */
  recurringDescription: 'discounted' | 'full_price' | 'discounted_then_full'
}

/**
 * Calculate expected pricing for a discount scenario
 * @param basePriceCents - Base package price in cents
 * @param addonPriceCents - Language addon price in cents
 * @param languageCount - Number of additional languages
 * @param couponDetails - Coupon details from getCouponDetails
 * @param couponAppliesToBase - Whether coupon applies to base package (product-restricted)
 */
export function calculateExpectedPricing(
  basePriceCents: number,
  addonPriceCents: number,
  languageCount: number,
  couponDetails: CouponDetails,
  couponAppliesToBase: boolean = true
): ExpectedPricing {
  const addonTotal = addonPriceCents * languageCount
  const subtotal = basePriceCents + addonTotal

  // Calculate discount - only applies to base if product-restricted
  const discountableAmount = couponAppliesToBase ? basePriceCents : subtotal
  const discountAmount = Math.round(discountableAmount * (couponDetails.percentOff / 100))

  // Due today = subtotal - discount (language addons are one-time, always included in first payment)
  const dueToday = subtotal - discountAmount

  // Recurring amount depends on duration
  let recurringAmount: number
  let recurringDescription: 'discounted' | 'full_price' | 'discounted_then_full'

  switch (couponDetails.duration) {
    case 'once':
      // After first month, full price
      recurringAmount = basePriceCents
      recurringDescription = 'full_price'
      break
    case 'forever':
      // Discount applies to all future payments
      recurringAmount = basePriceCents - Math.round(basePriceCents * (couponDetails.percentOff / 100))
      recurringDescription = 'discounted'
      break
    case 'repeating':
      // Discount for N months, then full price
      // For UI, we show the discounted recurring amount during the discount period
      recurringAmount = basePriceCents - Math.round(basePriceCents * (couponDetails.percentOff / 100))
      recurringDescription = 'discounted_then_full'
      break
    default:
      recurringAmount = basePriceCents
      recurringDescription = 'full_price'
  }

  return {
    dueToday,
    recurringAmount,
    discountAmount,
    subtotal,
    recurringDescription
  }
}

/**
 * Get the Stripe client for direct API validation in tests
 */
export function getStripeClient(): Stripe {
  return stripe
}
