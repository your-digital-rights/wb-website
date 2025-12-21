/**
 * Step 14: Comprehensive Stripe Validation Tests
 * Tests that validate actual Stripe objects match UI and database
 */

import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { seedStep14TestSession, cleanupTestSession } from './helpers/seed-step14-session'
import { ensureTestCouponsExist, getStripePrices, getTestCouponIds, type CouponIdSet } from './fixtures/stripe-setup'
import { validateStripePaymentComplete } from './helpers/stripe-validation'
import { getUIPaymentAmount, getUIRecurringAmount, fillStripePaymentForm } from './helpers/ui-parser'
import { StripePaymentService } from '@/services/payment/StripePaymentService'
import { triggerMockWebhookForPayment } from './helpers/mock-webhook'
import { setCookieConsentBeforeLoad } from './helpers/test-utils'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase credentials required for payment flow tests')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const stripePaymentService = new StripePaymentService()

// Helper: Wait for webhook processing
async function waitForPaymentCompletion(submissionId: string): Promise<boolean> {
  const maxAttempts = 40
  const delayMs = 500

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: submission } = await supabase
      .from('onboarding_submissions')
      .select('status')
      .eq('id', submissionId)
      .single()

    if (submission?.status === 'paid') {
      return true
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  console.warn(`⚠️  Webhook not processed after ${maxAttempts} attempts`)
  return false
}

// Helper: Get submission
async function getSubmission(submissionId: string) {
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch submission: ${error?.message}`)
  }

  return data
}

function deriveCouponSuffix(testInfo: import('@playwright/test').TestInfo): string {
  if (process.env.PW_COUPON_SUFFIX) {
    return process.env.PW_COUPON_SUFFIX
  }
  const index = typeof testInfo.parallelIndex === 'number' ? testInfo.parallelIndex : 0
  return `w${index}`
}

test.describe('Step 14: Stripe Validation (Comprehensive)', () => {
  test.describe.configure({ mode: 'serial' })

  let couponIds: CouponIdSet
  let stripePrices: Awaited<ReturnType<typeof getStripePrices>>

  test.beforeAll(async ({}, testInfo) => {
    console.log('\n=== STRIPE VALIDATION TESTS ===')
    console.log('Setting up test coupons...')
    const couponSuffix = deriveCouponSuffix(testInfo)
    couponIds = getTestCouponIds(couponSuffix)
    await ensureTestCouponsExist(couponIds)

    stripePrices = await getStripePrices()
    console.log('✓ Stripe connected')
    console.log('✓ Base price: €' + (stripePrices.base / 100))
    console.log('✓ Add-on price: €' + (stripePrices.addon / 100))
    console.log('')
  })

  test.afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  test('[COMPREHENSIVE] base package - validates UI matches Stripe prices', async ({ page }) => {
    test.setTimeout(180000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // SETUP: Get actual Stripe prices
      const prices = stripePrices
      console.log('Testing with Stripe base price:', prices.base, 'cents (€' + (prices.base / 100) + ')')

      // Seed session
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })

      // CRITICAL VALIDATION 1: UI shows Stripe price
      console.log('Validating UI prices...')
      const uiAmount = await getUIPaymentAmount(page)
      console.log('  UI Pay button amount:', uiAmount, 'cents')
      expect(uiAmount).toBe(prices.base)

      const uiRecurring = await getUIRecurringAmount(page)
      console.log('  UI recurring amount:', uiRecurring, 'cents')
      expect(uiRecurring).toBe(prices.base)

      console.log('✓ UI matches Stripe prices')

      // Complete payment
      await fillStripePaymentForm(page)
      await page.locator('#acceptTerms').click()

      const payButton = page.locator('button:has-text("Pay €")')
      await expect(payButton).toBeEnabled()
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // Wait for redirect
      await page.waitForURL(url => url.pathname.includes('/thank-you'), { timeout: 90000 })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      // Wait for webhook
      const webhookProcessed = await waitForPaymentCompletion(submissionId!)
      expect(webhookProcessed).toBe(true)

      // CRITICAL VALIDATION 2: Database correct
      console.log('Validating database...')
      const submission = await getSubmission(submissionId!)
      expect(submission.status).toBe('paid')
      expect(submission.payment_amount).toBe(prices.base)
      expect(submission.form_data.discountCode).toBeFalsy()
      console.log('✓ Database correct')

      // CRITICAL VALIDATION 3: Stripe objects correct
      console.log('Validating Stripe objects...')
      await validateStripePaymentComplete(submission, {
        totalAmount: prices.base,
        hasDiscount: false,
        recurringAmount: prices.base
      })

      console.log('✓ Payment Intent amount matches UI')
      console.log('✓ Subscription has NO discount')
      console.log('✓ Schedule has NO discount in phase')
      console.log('✓ Future invoices will charge €' + (prices.base / 100))
      console.log('')
      console.log('=== TEST PASSED: User paid exactly what they saw ===')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('[COMPREHENSIVE] 20% forever discount - validates discount in Stripe', async ({ page }) => {
    test.setTimeout(180000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // Get prices
      const prices = stripePrices
      const previewTotals = await stripePaymentService.previewInvoiceWithDiscount(
        null,
        process.env.STRIPE_BASE_PACKAGE_PRICE_ID!,
        couponIds.twentyPercent,
        0
      )
      const discountedRecurring = previewTotals.subscriptionAmount

      console.log('Base price:', prices.base, 'cents (€' + (prices.base / 100) + ')')
      console.log('Stripe preview total with 20% discount:', previewTotals.total, 'cents (€' + (previewTotals.total / 100) + ')')

      // Seed session
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })

      // Apply discount code
      console.log(`Applying ${couponIds.twentyPercent} discount code...`)
      const discountInput = page.getByRole('textbox', { name: /discount/i })
      await discountInput.fill(couponIds.twentyPercent)

      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      // VALIDATION 1: UI shows discount using Stripe-calculated totals
      await expect(page.getByTestId('discount-summary')).toBeVisible({ timeout: 15000 })
      await page.waitForFunction((expected) => {
        const preview = (window as any).__wb_lastDiscountPreview
        return !!preview && preview.total === expected
      }, previewTotals.total, { timeout: 15000 })

      const uiAmount = await getUIPaymentAmount(page)
      console.log('UI Pay button:', uiAmount, 'cents')
      expect(uiAmount).toBe(previewTotals.total)

      const uiRecurring = await getUIRecurringAmount(page)
      console.log('UI recurring:', uiRecurring, 'cents')
      expect(uiRecurring).toBe(discountedRecurring)
      console.log('✓ UI shows discounted amounts')

      await page.waitForFunction((expectedCode) => {
        return (window as any).__wb_lastCheckoutSession?.requestedDiscountCode === expectedCode
      }, couponIds.twentyPercent, { timeout: 15000 })

      const checkoutDebug = await page.evaluate(() => (window as any).__wb_lastCheckoutDebug)
      console.log('Checkout debug invoice:', checkoutDebug)
      const checkoutSession = await page.evaluate(() => (window as any).__wb_lastCheckoutSession)
      console.log('Checkout session payload:', checkoutSession)
      const discountMeta = await page.evaluate(() => (window as any).__wb_lastDiscountMeta)
      console.log('Discount meta:', discountMeta)
      const refreshPayloads = await page.evaluate(() => (window as any).__wb_refreshPayloads)
      console.log('Refresh payloads:', refreshPayloads)

      // Complete payment
      await fillStripePaymentForm(page)
      await page.locator('#acceptTerms').click()
      const payButton = page.locator('button:has-text("Pay €")')
      await expect(payButton).toBeEnabled()
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      await page.waitForURL(url => url.pathname.includes('/thank-you'), { timeout: 90000 })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      const webhookProcessed = await waitForPaymentCompletion(submissionId!)
      expect(webhookProcessed).toBe(true)

      // VALIDATION 2: Database has discount
      console.log('Validating database...')
      const submission = await getSubmission(submissionId!)
      expect(submission.status).toBe('paid')
      const stripeClient = stripePaymentService.getStripeInstance()
      const invoiceId = submission.payment_metadata?.invoice_id as string | undefined
      if (invoiceId) {
        const invoice = await stripeClient.invoices.retrieve(invoiceId)
        expect(invoice.total).toBe(previewTotals.total)
        const totalDiscount = (invoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0)
        expect(totalDiscount).toBeGreaterThan(0)
      } else {
        console.log('Stripe invoice ID missing on submission metadata')
      }

      expect(submission.payment_amount).toBe(previewTotals.total)
      expect(submission.form_data.discountCode).toBe(couponIds.twentyPercent)
      console.log('✓ Database records discount code')

      // CRITICAL VALIDATION 3: Stripe has discount
      console.log('Validating Stripe objects...')
      await validateStripePaymentComplete(submission, {
        totalAmount: previewTotals.total,
        hasDiscount: true,
        discountCode: couponIds.twentyPercent,
        discountPercent: 20,
        recurringAmount: discountedRecurring
      })

      console.log('✓ Payment Intent = discounted amount')
      console.log('✓ Subscription HAS 20% discount')
      console.log('✓ Schedule phase HAS discount')
      console.log('✓ Future invoices will charge €' + (discountedRecurring / 100))
      console.log('')
      console.log('=== TEST PASSED: Discount actually applied in Stripe ===')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })
})
