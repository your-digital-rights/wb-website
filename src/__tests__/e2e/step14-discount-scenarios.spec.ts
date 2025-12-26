/**
 * Step 14: Comprehensive Discount Scenarios E2E Tests
 *
 * These tests validate that discount codes are displayed correctly in the UI
 * and that the correct amounts are stored in the database.
 *
 * CRITICAL REGRESSION TESTS:
 * - Once discounts: recurring amount should show FULL price (discount only applies to first payment)
 * - Forever discounts: recurring amount should show DISCOUNTED price
 * - Repeating discounts: recurring amount should show DISCOUNTED price with duration indicator
 *
 * Scenarios covered:
 * 1. Partial discount (once) on base package only
 * 2. Partial discount (forever) on base package only
 * 3. Partial discount (repeating) on base package only
 * 4. Partial discount (once) on base + languages
 * 5. Partial discount (forever) on base + languages
 * 6. Partial discount (repeating) on base + languages
 * 7. 100% discount (forever) on base only
 * 8. 100% discount (forever) on base + languages
 * 9. 100% discount (once) on base only
 * 10. 100% discount (once) on base + languages
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { seedStep14TestSession, cleanupTestSession } from './helpers/seed-step14-session'
import {
  getStripePrices,
  getDiscountScenarioCouponIds,
  getDiscountScenarioPromoCodes,
  ensureDiscountScenarioCouponsExist,
  ensureDiscountScenarioPromoCodesExist,
  getCouponDetails,
  calculateExpectedPricing,
  getStripeClient,
  type DiscountScenarioCoupons,
  type DiscountScenarioPromoCodes,
  type CouponDetails,
  type ExpectedPricing
} from './fixtures/stripe-setup'
import { fillStripePaymentForm } from './helpers/ui-parser'
import { setCookieConsentBeforeLoad } from './helpers/test-utils'
import { triggerMockWebhookForPayment } from './helpers/mock-webhook'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Supabase client for database validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase credentials required for discount scenario tests')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const stripe = getStripeClient()

const DISCOUNT_WAIT_MS = 30000

/**
 * Derives a unique coupon suffix for parallel test isolation
 */
function deriveCouponSuffix(testInfo: import('@playwright/test').TestInfo): string {
  if (process.env.PW_COUPON_SUFFIX) {
    return process.env.PW_COUPON_SUFFIX
  }
  const index = typeof testInfo.parallelIndex === 'number' ? testInfo.parallelIndex : 0
  return `ds${index}`
}

/**
 * Formats cents to display string (e.g., 3500 -> "35" or "35.00")
 */
function formatCentsToDisplay(cents: number): string {
  const euros = cents / 100
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2)
}

/**
 * Extracts amount from UI text (e.g., "€35.00" -> 3500 cents)
 * Handles various formats: €35, €35.5, €35.50, €35,50
 */
function parseAmountFromText(text: string): number {
  const match = text.match(/€\s*(\d+(?:[.,]\d{1,2})?)/)
  if (!match) {
    throw new Error(`Could not parse amount from: ${text}`)
  }
  const normalized = match[1].replace(',', '.')
  return Math.round(parseFloat(normalized) * 100)
}

/**
 * Waits for webhook processing
 */
async function waitForWebhookProcessing(
  submissionId: string,
  expectedStatus: 'paid' | 'submitted' = 'paid',
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<boolean> {
  const { maxAttempts = 60, delayMs = 500 } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: submission } = await supabase
      .from('onboarding_submissions')
      .select('status, stripe_subscription_id, payment_completed_at')
      .eq('id', submissionId)
      .single()

    if (submission?.status === expectedStatus) {
      return true
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  console.warn(`Webhook not processed after ${maxAttempts} attempts`)
  return false
}

test.describe('Step 14: Discount Scenarios - UI Validation', () => {
  // Run tests in parallel to see all results even if some fail
  test.describe.configure({ mode: 'parallel' })

  let couponIds: DiscountScenarioCoupons
  let promoCodes: DiscountScenarioPromoCodes
  let stripePrices: Awaited<ReturnType<typeof getStripePrices>>
  let couponDetailsCache: Map<string, CouponDetails>

  test.beforeAll(async ({}, testInfo) => {
    console.log('Setting up discount scenario test environment...')
    const suffix = deriveCouponSuffix(testInfo)
    couponIds = getDiscountScenarioCouponIds(suffix)
    promoCodes = getDiscountScenarioPromoCodes(suffix)

    // Create coupons and promo codes
    await ensureDiscountScenarioCouponsExist(couponIds)
    await ensureDiscountScenarioPromoCodesExist(promoCodes, couponIds)

    stripePrices = await getStripePrices()
    console.log('Base price:', stripePrices.base, 'cents')
    console.log('Addon price:', stripePrices.addon, 'cents')

    // Cache coupon details
    couponDetailsCache = new Map()
    for (const [key, id] of Object.entries(couponIds)) {
      const details = await getCouponDetails(id)
      couponDetailsCache.set(key, details)
      console.log(`Coupon ${key}:`, details)
    }
  })

  test.beforeEach(async ({ page }) => {
    await setCookieConsentBeforeLoad(page, true, false)
  })

  test.afterEach(async () => {
    // Cooldown between tests
    await new Promise(resolve => setTimeout(resolve, 1000))
  })

  /**
   * Helper to validate UI amounts after applying a discount code
   */
  async function validateDiscountUI(
    page: import('@playwright/test').Page,
    promoCode: string,
    expectedPricing: ExpectedPricing,
    couponDetails: CouponDetails
  ) {
    // Apply discount code
    const discountInput = page.getByRole('textbox', { name: /discount/i })
    await discountInput.fill(promoCode)
    const applyButton = page.getByRole('button', { name: /Apply|Verify/i })
    await applyButton.click()

    // Wait for discount to be applied
    await page.waitForFunction(
      (code: string) => {
        const meta = (window as any).__wb_lastDiscountMeta
        return meta?.code === code
      },
      promoCode,
      { timeout: DISCOUNT_WAIT_MS }
    )

    // Verify discount applied message
    await expect(page.locator(`text=/Discount code.*applied/i`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })

    // CRITICAL: Validate "Due Today" amount
    const dueTodaySection = page.locator('text=/Due Today/i').locator('..')
    await expect(dueTodaySection).toBeVisible()

    const totalAmountLocator = page.locator('p.text-2xl.font-bold.text-primary')
    const totalText = await totalAmountLocator.textContent()
    const actualDueToday = parseAmountFromText(totalText || '')

    console.log(`Due Today - Expected: €${formatCentsToDisplay(expectedPricing.dueToday)}, Actual: €${formatCentsToDisplay(actualDueToday)}`)
    expect(actualDueToday).toBe(expectedPricing.dueToday)

    // CRITICAL REGRESSION CHECK: Validate recurring amount
    // This is where the bug manifests - once discounts show discounted recurring instead of full price
    const recurringText = await page.locator('text=/Then €/i').first().textContent()
    const actualRecurring = parseAmountFromText(recurringText || '')

    console.log(`Recurring - Expected: €${formatCentsToDisplay(expectedPricing.recurringAmount)}, Actual: €${formatCentsToDisplay(actualRecurring)}`)
    console.log(`Duration: ${couponDetails.duration}, Expected behavior: ${expectedPricing.recurringDescription}`)

    // THIS IS THE KEY ASSERTION FOR THE REGRESSION
    expect(actualRecurring).toBe(expectedPricing.recurringAmount)

    // Validate discount badge shows correct amount
    const discountBadge = page.getByTestId('discount-summary')
    if (expectedPricing.discountAmount > 0) {
      await expect(discountBadge).toBeVisible()
      const discountText = await discountBadge.textContent()
      const actualDiscount = parseAmountFromText(discountText || '')
      console.log(`Discount - Expected: €${formatCentsToDisplay(expectedPricing.discountAmount)}, Actual: €${formatCentsToDisplay(actualDiscount)}`)
      expect(actualDiscount).toBe(expectedPricing.discountAmount)
    }

    // Validate Pay button amount - allow for different decimal formats
    const payButtonAmount = expectedPricing.dueToday / 100
    const payButtonLocator = page.locator('button').filter({ hasText: /Pay €/ })
    await expect(payButtonLocator.first()).toBeVisible()
    const buttonText = await payButtonLocator.first().textContent()
    const buttonAmount = parseAmountFromText(buttonText || '')
    console.log(`Pay Button - Expected: €${payButtonAmount}, Actual: €${buttonAmount / 100}`)
    expect(buttonAmount).toBe(expectedPricing.dueToday)
  }

  // ============================================================================
  // PARTIAL DISCOUNT TESTS - BASE PACKAGE ONLY
  // ============================================================================

  test('partial discount (once) on base only - recurring shows FULL price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialOnce')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0, // no languages
        couponDetails,
        true // applies to base only
      )

      console.log('\n=== PARTIAL ONCE (Base Only) ===')
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialOnce, expectedPricing, couponDetails)

      console.log('PASS: Once discount correctly shows FULL recurring price')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('partial discount (forever) on base only - recurring shows DISCOUNTED price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialForever')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      console.log('\n=== PARTIAL FOREVER (Base Only) ===')
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialForever, expectedPricing, couponDetails)

      console.log('PASS: Forever discount correctly shows DISCOUNTED recurring price')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('partial discount (repeating 3mo) on base only', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialRepeating')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      console.log('\n=== PARTIAL REPEATING (Base Only) ===')
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}, months: ${couponDetails.durationInMonths}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialRepeating, expectedPricing, couponDetails)

      console.log('PASS: Repeating discount shows correct amounts')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  // ============================================================================
  // PARTIAL DISCOUNT TESTS - WITH LANGUAGE ADD-ONS
  // ============================================================================

  test('partial discount (once) on base + languages - recurring shows FULL price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    try {
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialOnce')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        languageCount,
        couponDetails,
        true // discount applies to base only, not languages
      )

      console.log('\n=== PARTIAL ONCE (Base + Languages) ===')
      console.log(`Languages: ${languageCount}, Addon total: €${formatCentsToDisplay(stripePrices.addon * languageCount)}`)
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialOnce, expectedPricing, couponDetails)

      console.log('PASS: Once discount with languages correctly shows FULL recurring price')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('partial discount (forever) on base + languages - recurring shows DISCOUNTED price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    try {
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialForever')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        languageCount,
        couponDetails,
        true
      )

      console.log('\n=== PARTIAL FOREVER (Base + Languages) ===')
      console.log(`Languages: ${languageCount}`)
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialForever, expectedPricing, couponDetails)

      console.log('PASS: Forever discount with languages correctly shows DISCOUNTED recurring price')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('partial discount (repeating) on base + languages', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    try {
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialRepeating')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        languageCount,
        couponDetails,
        true
      )

      console.log('\n=== PARTIAL REPEATING (Base + Languages) ===')
      console.log(`Languages: ${languageCount}`)
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}, months: ${couponDetails.durationInMonths}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (${expectedPricing.recurringDescription})`)

      await validateDiscountUI(page, promoCodes.partialRepeating, expectedPricing, couponDetails)

      console.log('PASS: Repeating discount with languages shows correct amounts')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  // ============================================================================
  // 100% DISCOUNT TESTS - BASE PACKAGE ONLY
  // ============================================================================

  test('100% discount (forever) on base only - recurring shows €0', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('fullForever')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      console.log('\n=== 100% FOREVER (Base Only) ===')
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)}`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)}`)

      await validateDiscountUI(page, promoCodes.fullForever, expectedPricing, couponDetails)

      console.log('PASS: 100% forever discount shows €0 recurring')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('100% discount (once) on base only - recurring shows FULL price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('fullOnce')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      console.log('\n=== 100% ONCE (Base Only) ===')
      console.log(`Coupon: ${couponDetails.percentOff}% off, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)} (FREE first month)`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (FULL price after)`)

      await validateDiscountUI(page, promoCodes.fullOnce, expectedPricing, couponDetails)

      console.log('PASS: 100% once discount correctly shows FULL recurring price')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  // ============================================================================
  // 100% DISCOUNT TESTS - WITH LANGUAGE ADD-ONS
  // ============================================================================

  test('100% discount (forever) on base + languages - languages still charged', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    try {
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('fullForever')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        languageCount,
        couponDetails,
        true // discount applies to base only
      )

      console.log('\n=== 100% FOREVER (Base + Languages) ===')
      console.log(`Languages: ${languageCount}, Language total: €${formatCentsToDisplay(stripePrices.addon * languageCount)}`)
      console.log(`Coupon: ${couponDetails.percentOff}% off BASE, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)} (languages only)`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (€0 base)`)

      await validateDiscountUI(page, promoCodes.fullForever, expectedPricing, couponDetails)

      console.log('PASS: 100% forever discount with languages correctly charges for languages')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('100% discount (once) on base + languages - recurring shows FULL base price', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    try {
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('fullOnce')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        languageCount,
        couponDetails,
        true
      )

      console.log('\n=== 100% ONCE (Base + Languages) ===')
      console.log(`Languages: ${languageCount}`)
      console.log(`Coupon: ${couponDetails.percentOff}% off BASE, duration: ${couponDetails.duration}`)
      console.log(`Expected Due Today: €${formatCentsToDisplay(expectedPricing.dueToday)} (languages only, base FREE)`)
      console.log(`Expected Recurring: €${formatCentsToDisplay(expectedPricing.recurringAmount)} (FULL base price)`)

      await validateDiscountUI(page, promoCodes.fullOnce, expectedPricing, couponDetails)

      console.log('PASS: 100% once discount with languages correctly shows FULL recurring')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })
})

// ============================================================================
// FULL PAYMENT FLOW TESTS - Database Validation
// ============================================================================

test.describe('Step 14: Discount Scenarios - Full Payment + DB Validation', () => {
  test.describe.configure({ mode: 'serial' })

  let couponIds: DiscountScenarioCoupons
  let promoCodes: DiscountScenarioPromoCodes
  let stripePrices: Awaited<ReturnType<typeof getStripePrices>>
  let couponDetailsCache: Map<string, CouponDetails>

  test.beforeAll(async ({}, testInfo) => {
    console.log('Setting up discount scenario test environment (full payment)...')
    const suffix = deriveCouponSuffix(testInfo)
    couponIds = getDiscountScenarioCouponIds(suffix)
    promoCodes = getDiscountScenarioPromoCodes(suffix)

    await ensureDiscountScenarioCouponsExist(couponIds)
    await ensureDiscountScenarioPromoCodesExist(promoCodes, couponIds)

    stripePrices = await getStripePrices()

    couponDetailsCache = new Map()
    for (const [key, id] of Object.entries(couponIds)) {
      const details = await getCouponDetails(id)
      couponDetailsCache.set(key, details)
    }
  })

  test.beforeEach(async ({ page }) => {
    await setCookieConsentBeforeLoad(page, true, false)
  })

  test.afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  test('partial once discount - full payment validates DB amounts', async ({ page }) => {
    test.setTimeout(180000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialOnce')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      // Apply discount
      const discountInput = page.getByRole('textbox', { name: /discount/i })
      await discountInput.fill(promoCodes.partialOnce)
      await page.getByRole('button', { name: /Apply|Verify/i }).click()

      await page.waitForFunction(
        (code: string) => (window as any).__wb_lastDiscountMeta?.code === code,
        promoCodes.partialOnce,
        { timeout: DISCOUNT_WAIT_MS }
      )

      // Complete payment
      await page.locator('#acceptTerms').click()
      await fillStripePaymentForm(page)
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      await triggerMockWebhookForPayment(submissionId!)
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid')
      expect(webhookProcessed).toBe(true)

      // DATABASE VALIDATION
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()
      expect(submission.status).toBe('paid')

      // Validate payment amount matches expected due today
      console.log(`DB payment_amount: ${submission.payment_amount}, Expected: ${expectedPricing.dueToday}`)
      expect(submission.payment_amount).toBe(expectedPricing.dueToday)

      // Validate payment_metadata
      const metadata = submission.payment_metadata || {}
      console.log('Payment metadata:', metadata)
      expect(metadata.subtotal).toBe(expectedPricing.subtotal)
      expect(metadata.discount_amount).toBe(expectedPricing.discountAmount)

      // Validate Stripe subscription has correct coupon
      const stripeSubscription = await stripe.subscriptions.retrieve(submission.stripe_subscription_id!)
      expect(stripeSubscription.discount?.coupon?.id).toBe(couponIds.partialOnce)
      expect(stripeSubscription.discount?.coupon?.duration).toBe('once')

      console.log('PASS: Partial once discount - DB validation complete')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('partial forever discount - full payment validates DB amounts', async ({ page }) => {
    test.setTimeout(180000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const couponDetails = couponDetailsCache.get('partialForever')!
      const expectedPricing = calculateExpectedPricing(
        stripePrices.base,
        stripePrices.addon,
        0,
        couponDetails,
        true
      )

      // Apply discount
      const discountInput = page.getByRole('textbox', { name: /discount/i })
      await discountInput.fill(promoCodes.partialForever)
      await page.getByRole('button', { name: /Apply|Verify/i }).click()

      await page.waitForFunction(
        (code: string) => (window as any).__wb_lastDiscountMeta?.code === code,
        promoCodes.partialForever,
        { timeout: DISCOUNT_WAIT_MS }
      )

      // Complete payment
      await page.locator('#acceptTerms').click()
      await fillStripePaymentForm(page)
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      await triggerMockWebhookForPayment(submissionId!)
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid')
      expect(webhookProcessed).toBe(true)

      // DATABASE VALIDATION
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()
      expect(submission.status).toBe('paid')
      expect(submission.payment_amount).toBe(expectedPricing.dueToday)

      // Validate Stripe subscription has forever coupon
      const stripeSubscription = await stripe.subscriptions.retrieve(submission.stripe_subscription_id!)
      expect(stripeSubscription.discount?.coupon?.id).toBe(couponIds.partialForever)
      expect(stripeSubscription.discount?.coupon?.duration).toBe('forever')

      console.log('PASS: Partial forever discount - DB validation complete')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })
})
