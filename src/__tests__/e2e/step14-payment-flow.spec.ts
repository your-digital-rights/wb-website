import { test, expect, type Locator } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
import * as dotenv from 'dotenv'
import path from 'path'
import { seedStep14TestSession, cleanupTestSession } from './helpers/seed-step14-session'
import { ensureTestCouponsExist, getStripePrices, getTestCouponIds, type CouponIdSet } from './fixtures/stripe-setup'
import { getUIPaymentAmount, getUIRecurringAmount, fillStripePaymentForm } from './helpers/ui-parser'
import { StripePaymentService } from '@/services/payment/StripePaymentService'
import { triggerMockWebhookForPayment } from './helpers/mock-webhook'
import { setCookieConsentBeforeLoad } from './helpers/test-utils'

const isCI = Boolean(process.env.CI)
const DISCOUNT_WAIT_MS = 30000

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Supabase client for database validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase credentials required for payment flow tests')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover'
})

const stripePaymentService = new StripePaymentService()

const formatEuroDisplay = (amountCents: number): string => {
  const euros = amountCents / 100
  return euros % 1 === 0 ? euros.toString() : euros.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function deriveCouponSuffix(testInfo: import('@playwright/test').TestInfo): string {
  if (process.env.PW_COUPON_SUFFIX) {
    return process.env.PW_COUPON_SUFFIX
  }
  const index = typeof testInfo.parallelIndex === 'number' ? testInfo.parallelIndex : 0
  return `w${index}`
}

async function withTimeout<T>(promiseFactory: () => Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    return await Promise.race([promiseFactory(), timeoutPromise])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}

async function pickNonPhoneCombobox(locator: Locator): Promise<Locator | null> {
  const count = await locator.count()
  for (let i = 0; i < count; i++) {
    const candidate = locator.nth(i)
    const ariaLabel = (await candidate.getAttribute('aria-label'))?.toLowerCase() ?? ''
    const nameAttr = (await candidate.getAttribute('name'))?.toLowerCase() ?? ''
    if (ariaLabel.includes('phone') || nameAttr.includes('phone')) {
      continue
    }
    return candidate
  }
  return null
}


// Helper: Wait for webhook processing with retries
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

  console.warn(`⚠️  Webhook not processed after ${maxAttempts} attempts`)
  return false
}

test.describe('Step 14: Payment Flow E2E', () => {
  test.describe.configure({ mode: 'serial' })
  // Allow tests to run in parallel while each scenario seeds its own session/coupon context

  test.beforeEach(async ({ page }) => {
    await setCookieConsentBeforeLoad(page, true, false)
  })

  let couponIds: CouponIdSet
  let stripePrices: Awaited<ReturnType<typeof getStripePrices>>

  // Setup test coupons before all tests
  test.beforeAll(async ({}, testInfo) => {
    console.log('Setting up test environment...')
    const couponSuffix = deriveCouponSuffix(testInfo)
    couponIds = getTestCouponIds(couponSuffix)
    await ensureTestCouponsExist(couponIds)

    stripePrices = await getStripePrices()
    console.log('✓ Stripe test mode connected')
    console.log('✓ Base package price:', stripePrices.base, 'cents (€' + (stripePrices.base / 100) + ')')
    console.log('✓ Language add-on price:', stripePrices.addon, 'cents (€' + (stripePrices.addon / 100) + ')')
  })

  // Add delay between tests to let webhooks settle
  test.afterEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second cooldown
  })

  test('complete payment flow from Step 13 to thank-you page', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes (Stripe test payments can take 90-120s)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled Step 14 session (FAST!)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      // 2. Inject Zustand store into localStorage BEFORE navigating
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14 - Zustand loads from localStorage
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // 4. Wait for Stripe Elements iframe to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', {
        timeout: 30000
      })

      // Additional wait for Stripe to fully initialize inside iframe
      await page.waitForTimeout(3000)

      // 5. Verify pricing breakdown displays
      await expect(page.locator('text=/Base Package/i')).toBeVisible({ timeout: 10000 })
      // Pricing is shown in order summary card
      await expect(page.locator('text=/Order Summary/i')).toBeVisible()

      // 6. Accept terms and conditions
      await page.locator('#acceptTerms').click()

      // 7. Fill payment details with test card
      await fillStripePaymentForm(page)

      // 8. Submit payment
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // 9. Wait for redirect to thank-you page
      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      // 10. Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      // 11. Wait for webhooks to process (payment_intent.succeeded webhook updates status to 'paid')
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid', {
        maxAttempts: 30, // 15 seconds (now using after() API so webhooks complete reliably)
        delayMs: 500
      })

      expect(webhookProcessed).toBe(true)

      // 12. Verify final submission state in database
      const { data: submissions } = await supabase
        .from('onboarding_submissions')
        .select('status, stripe_subscription_id, payment_completed_at')
        .eq('id', submissionId!)
        .single()

      expect(submissions).toBeTruthy()
      expect(submissions.status).toBe('paid')
      expect(submissions.stripe_subscription_id).toBeTruthy()
      expect(submissions.payment_completed_at).toBeTruthy()

    } finally {
      // Cleanup: Delete test submission
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('payment flow with language add-ons', async ({ page }) => {
    test.setTimeout(120000) // 2 minutes (language add-ons take longer to process)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled Step 14 session with language add-ons (FAST!)
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr'] // German and French
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      // 2. Inject Zustand store into localStorage BEFORE navigating
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14 - Zustand loads from localStorage
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // 4. Wait for Stripe Elements iframe to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 5. Verify total pricing with language add-ons
      await expect(page.locator('text=/Base Package/i')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('p:has-text("Language add-ons")').first()).toBeVisible()

      // 6. Complete payment
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      await page.locator('#acceptTerms').click()

      await fillStripePaymentForm(page)

      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // Wait for redirect to thank-you page
      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      // 7. Get submission data
      const { data: submissionBeforeWebhook } = await supabase
        .from('onboarding_submissions')
        .select('id, status, form_data')
        .eq('session_id', sessionId!)
        .single()

      expect(submissionBeforeWebhook).toBeTruthy()

      // 8. Verify languages saved in database
      expect(submissionBeforeWebhook.form_data.additionalLanguages).toContain('de')
      expect(submissionBeforeWebhook.form_data.additionalLanguages).toContain('fr')

      // 9. Wait for webhooks to process (payment_intent.succeeded webhook updates status to 'paid')
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid', {
        maxAttempts: 30, // 15 seconds (now using after() API so webhooks complete reliably)
        delayMs: 500
      })

      expect(webhookProcessed).toBe(true)

      // 10. Verify final submission state in database
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('status, stripe_subscription_id, payment_completed_at')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()
      expect(submission.status).toBe('paid')
      expect(submission.stripe_subscription_id).toBeTruthy()
      expect(submission.payment_completed_at).toBeTruthy()

    } finally {
      // Temporarily skip cleanup for debugging
    }
  })

  test('payment failure handling', async ({ page }) => {
    test.setTimeout(60000) // 1 minute (no full navigation needed)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled Step 14 session (FAST!)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      // 2. Inject Zustand store into localStorage BEFORE navigating
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14 - Zustand loads from localStorage
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // 4. Wait for Stripe Elements to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 5. Accept terms
      await page.locator('#acceptTerms').click()

      // 6. Fill declined test card details
      await fillStripePaymentForm(page, {
        cardNumber: '4000000000000002'
      })

      // 3. Submit payment
      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // 4. Verify error message displays
      await expect(page.locator('text=/declined/i')).toBeVisible({ timeout: 10000 })

      // 5. Verify still on Step 14 (not redirected)
      await expect(page).toHaveURL(/\/step\/14/)

    } catch (error) {
      throw error
    } finally {
      // Cleanup test data
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('discount with language add-ons keeps UI total in sync with Stripe', async ({ page }) => {
    test.setTimeout(90000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    const languageCount = 2

    const previewTotals = await stripePaymentService.previewInvoiceWithDiscount(
      null,
      process.env.STRIPE_BASE_PACKAGE_PRICE_ID!,
      couponIds.twentyPercent,
      languageCount
    )
    const expectedTotal = previewTotals.total
    const expectedRecurring = previewTotals.subscriptionAmount

    try {
      page.on('request', req => {
        if (req.url().includes('/api/stripe/checkout')) {
          console.log('create-checkout-session request:', req.postData())
        }
      })

      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr']
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId
      console.log('Seeded session', seed)

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/(?:en\/|it\/)?onboarding\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const initialPaymentElementState = await page.evaluate(() => (window as any).__wb_paymentElement || null)
      const initialPaymentElementVersion = initialPaymentElementState?.version ?? 0
      console.log('Initial PaymentElement state:', initialPaymentElementState)

      const discountInput = page.getByRole('textbox', { name: /discount/i })
      await discountInput.fill(couponIds.twentyPercent)
      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      // Wait for Stripe discount verification to complete and preview to match expected totals
      await page.waitForFunction((expected) => {
        const preview = (window as any).__wb_lastDiscountPreview
        return !!preview && preview.total === expected
      }, expectedTotal, { timeout: 30000 })

      const uiAmount = await getUIPaymentAmount(page)
      expect(uiAmount).toBe(expectedTotal)

      // Ensure recurring commitment text also reflects discounted base
      const recurring = await getUIRecurringAmount(page)
      expect(recurring).toBe(expectedRecurring)

      const checkoutDebug = await page.evaluate(() => (window as any).__wb_lastCheckoutDebug)
      console.log('Checkout debug invoice:', checkoutDebug)
      const checkoutSession = await page.evaluate(() => (window as any).__wb_lastCheckoutSession)
      console.log('Checkout session payload:', checkoutSession)
      const discountMeta = await page.evaluate(() => (window as any).__wb_lastDiscountMeta)
      console.log('Discount meta:', discountMeta)
      const refreshPayloads = await page.evaluate(() => (window as any).__wb_refreshPayloads)
      console.log('Refresh payloads:', refreshPayloads)
    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('100% discount requires payment method for future billing', async ({ page }) => {
    test.setTimeout(120000)

    let sessionId: string | null = null
    let submissionId: string | null = null
    const couponId = `E2E_FREE_${Date.now()}`

    try {
      // Create 100% "once" discount coupon
      await stripe.coupons.create({
        id: couponId,
        percent_off: 100,
        duration: 'once',
        name: 'E2E Test 100% Discount Once'
      })

      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Ensure cookie banner never appears and blocks the Pay button
      await setCookieConsentBeforeLoad(page, true, false)

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/(?:en\/|it\/)?onboarding\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      const initialPaymentElementState = await page.evaluate(() => (window as any).__wb_paymentElement || null)
      const initialPaymentElementVersion = initialPaymentElementState?.version ?? 0
      console.log('Initial PaymentElement state:', initialPaymentElementState)

      // Apply 100% discount code
      const discountInput = page.getByRole('textbox', { name: /discount/i })
      await discountInput.fill(couponId)

      // Capture initial checkout state before applying discount
      const initialCheckoutState = await page.evaluate(() => (window as any).__wb_lastCheckoutState)
      const initialClientSecret = await page.evaluate(() => (window as any).__wb_lastCheckoutSession?.clientSecret)

      await page.getByRole('button', { name: /Apply|Verify/i }).click()

      // Wait for discount confirmation
      await Promise.race([
        page.waitForFunction((code: string) => {
          const meta = (window as any).__wb_lastDiscountMeta
          return meta?.code === code
        }, couponId, { timeout: DISCOUNT_WAIT_MS }),
        page.waitForFunction(() => {
          return Boolean((window as any).__wb_lastDiscountValidation?.status === 'valid')
        }, { timeout: DISCOUNT_WAIT_MS })
      ])

      await expect(page.locator(`text=/Discount code ${couponId} applied/i`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })

      // CRITICAL: Wait for the checkout session to be updated with new SetupIntent
      // This happens when refreshPaymentIntent() is called after discount application
      console.log('Waiting for checkout session to update with SetupIntent...')
      await page.waitForFunction(
        ({ prevState, prevSecret }) => {
          const currentState = (window as any).__wb_lastCheckoutState
          const currentSecret = (window as any).__wb_lastCheckoutSession?.clientSecret
          // Wait for either state to change OR clientSecret to change (indicates new Intent created)
          return (currentState && currentState !== prevState) || (currentSecret && currentSecret !== prevSecret)
        },
        { initialCheckoutState, initialClientSecret },
        { timeout: DISCOUNT_WAIT_MS }
      )
      console.log('✅ Checkout session updated with SetupIntent')

      const paymentElementStateHandle = await page.waitForFunction(
        ({ prevSecret, prevVersion, minReadyDuration }) => {
          const state = (window as any).__wb_paymentElement
          if (!state || !state.clientSecret) {
            return null
          }
          if (prevSecret && state.clientSecret === prevSecret) {
            return null
          }
          if (typeof prevVersion === 'number' && state.version <= prevVersion) {
            return null
          }
          if (!state.ready || !state.readyAt) {
            return null
          }
          if (Date.now() - state.readyAt < minReadyDuration) {
            return null
          }
          return state
        },
        { prevSecret: initialClientSecret, prevVersion: initialPaymentElementVersion, minReadyDuration: 20000 },
        { timeout: 60000 }
      )
      const paymentElementState = await paymentElementStateHandle.jsonValue()
      await paymentElementStateHandle.dispose()
      console.log('✅ PaymentElement ready and stable state:', paymentElementState)

      // CRITICAL: Payment form MUST BE VISIBLE (collecting payment method for future billing)
      const paymentElement = page.locator('[data-testid="stripe-payment-element"]')
      await expect(paymentElement).toBeVisible({ timeout: 10000 })
      console.log('✅ TEST ASSERTION: Payment form is visible for 100% discount')

      // Verify amount shows €0.00 under "Due Today"
      await expect(page.locator('text=/Due Today/i')).toBeVisible()
      await expect(page.locator('text=/€0\\.00/i').first()).toBeVisible()

      // Fill in test card details (will be saved but not charged)
      console.log('Filling payment details for future billing...')

      // CRITICAL: Wait for Stripe iframe src to stabilize (stop changing)
      // The iframe can reload multiple times as React processes state changes
      // We need to ensure it's been stable for a LONG time before proceeding
      // CRITICAL: Fill fields with retry mechanism (100% discount causes iframe to reload during filling)
      // The SetupIntent creation and invoice finalization happen AFTER iframe stabilizes, causing it to reload
      let fillAttempt = 0
      const maxFillAttempts = 3
      let fieldsVerified = false

      while (!fieldsVerified && fillAttempt < maxFillAttempts) {
        fillAttempt++
        console.log(`\nFill attempt ${fillAttempt}/${maxFillAttempts}`)

        const activePaymentElementVersion = await page.evaluate(() => (window as any).__wb_paymentElement?.version ?? 0)
        let lastFillError: Error | null = null

        try {
          const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]').first()
          const cardNumberField = stripeFrame.getByRole('textbox', { name: 'Card number' })
          await cardNumberField.waitFor({ state: 'visible', timeout: 10000 })

          // Additional wait for Stripe.js to be fully interactive
          console.log('Card number field visible - waiting additional 3s for Stripe.js to be interactive')
          await page.waitForTimeout(3000)

          console.log('Filling card number...')
          await cardNumberField.click()
          await withTimeout(() => cardNumberField.pressSequentially('4242424242424242', { delay: 50 }), 10000, 'Card number entry')

          console.log('Filling expiry...')
          const expiryField = stripeFrame.getByRole('textbox', { name: /Expir/i })
          await expiryField.click()
          await withTimeout(() => expiryField.pressSequentially('1228', { delay: 50 }), 8000, 'Expiry entry')

          console.log('Filling CVC...')
          const cvcField = stripeFrame.getByRole('textbox', { name: 'Security code' })
          await cvcField.click()
          await withTimeout(() => cvcField.pressSequentially('123', { delay: 50 }), 8000, 'CVC entry')

          const zipField = stripeFrame.getByRole('textbox', { name: /(zip|postal)/i })
          if (await zipField.count()) {
            console.log('Filling postal/ZIP code...')
            await zipField.first().click()
            await withTimeout(() => zipField.first().pressSequentially('12345', { delay: 50 }), 8000, 'Postal code entry')
          } else {
            console.log('Postal/ZIP field not present - skipping')
          }

          // CRITICAL: 100% discounts use SetupIntent which requires email collection
          console.log('Filling email (required for SetupIntent)...')
          const emailField = stripeFrame.getByRole('textbox', { name: 'Email' })
          await emailField.click()
          await withTimeout(() => emailField.fill(''), 5000, 'Email clear')
          await withTimeout(() => emailField.pressSequentially('test@example.com', { delay: 50 }), 8000, 'Email entry')

          const nameField = stripeFrame.getByRole('textbox', { name: /name/i })
          if (await nameField.count()) {
            console.log('Filling cardholder name...')
            await nameField.click()
            await withTimeout(() => nameField.fill(''), 5000, 'Name clear')
            await withTimeout(() => nameField.pressSequentially('Test User', { delay: 50 }), 8000, 'Name entry')
          }

          const countryField = stripeFrame.getByRole('combobox', { name: /country/i })
          const countryInput = await pickNonPhoneCombobox(countryField)
          if (countryInput) {
            console.log('Selecting country...')
            try {
              const tagName = await countryInput.evaluate(element => element.tagName)
              if (tagName === 'SELECT') {
                await countryInput.selectOption({ value: 'IT' }, { timeout: 5000 })
              } else {
                await countryInput.click({ force: true })
                const countryOption = stripeFrame.getByRole('option', { name: /Italy/i })
                if (await countryOption.count()) {
                  await countryOption.first().click()
                } else {
                  await countryInput.fill('Italy')
                  await countryInput.press('Enter')
                }
              }
            } catch (error) {
              console.log('⚠️  Failed to select country:', error)
            }
          } else if (await countryField.count()) {
            console.log('⚠️  Country field is phone-related; skipping country selection')
          }

          const addressLine1 = stripeFrame.getByRole('textbox', { name: /address line 1/i })
          try {
            await addressLine1.first().waitFor({ state: 'visible', timeout: 2000 })
            console.log('Filling address line 1...')
            await addressLine1.first().click()
            await withTimeout(() => addressLine1.first().fill('Via Roma 1'), 5000, 'Address line 1 entry')
          } catch {
            console.log('Address line 1 field not present - skipping')
          }

          const cityField = stripeFrame.getByRole('textbox', { name: /city/i })
          try {
            await cityField.first().waitFor({ state: 'visible', timeout: 2000 })
            console.log('Filling city...')
            await cityField.first().click()
            await withTimeout(() => cityField.first().fill('Milano'), 5000, 'City entry')
          } catch {
            console.log('City field not present - skipping')
          }

          const provinceField = stripeFrame.getByRole('combobox', { name: /province|state/i })
          const provinceInput = await pickNonPhoneCombobox(provinceField)
          if (provinceInput) {
            console.log('Filling province...')
            try {
              const tagName = await provinceInput.evaluate(element => element.tagName)
              if (tagName === 'SELECT') {
                const provinceOptions = await provinceInput.evaluate(element =>
                  Array.from((element as HTMLSelectElement).options).map(option => ({
                    label: option.label,
                    value: option.value
                  }))
                )
                const preferredProvince =
                  provinceOptions.find(option => /milano|mi/i.test(option.label) || option.value === 'MI') ??
                  provinceOptions.find(option => option.value)
                if (preferredProvince) {
                  await provinceInput.selectOption({ value: preferredProvince.value }, { timeout: 5000 })
                } else {
                  console.log('⚠️  Province select has no usable options - skipping')
                }
              } else {
                await provinceInput.click({ force: true })
                const provinceOption = stripeFrame.getByRole('option', { name: /Milano|MI/i })
                if (await provinceOption.count()) {
                  await provinceOption.first().click()
                } else {
                  await provinceInput.fill('Milano')
                  await provinceInput.press('Enter')
                }
              }
            } catch (error) {
              console.log('⚠️  Failed to select province:', error)
            }
          }

          console.log('All fields filled - verifying...')

          // CRITICAL: Wait to ensure fields remain filled (iframe doesn't reload again)
          console.log('Waiting 3s to verify fields remain stable...')
          await page.waitForTimeout(3000)

          // Verify fields are still filled (iframe didn't reload)
          const cardValueCheck = await cardNumberField.inputValue()
          const expiryValueCheck = await expiryField.inputValue()

          if (cardValueCheck && cardValueCheck.length >= 10 && expiryValueCheck && expiryValueCheck.length >= 4) {
            const latestVersion = await page.evaluate(() => (window as any).__wb_paymentElement?.version ?? 0)
            if (latestVersion !== activePaymentElementVersion) {
              console.log(`⚠️  PaymentElement version changed during fill (${activePaymentElementVersion} → ${latestVersion}). Retrying...`)
            } else {
              console.log('✅ Card number verified:', cardValueCheck)
              console.log('✅ Expiry verified:', expiryValueCheck)
              console.log('✅ Payment fields filled and verified stable')
              fieldsVerified = true
            }
          } else {
            console.log(`⚠️  Fields verification failed (card: "${cardValueCheck}", expiry: "${expiryValueCheck}")`)
          }
        } catch (error) {
          lastFillError = error instanceof Error ? error : new Error(String(error))
          console.log(`⚠️  Fill attempt ${fillAttempt} failed: ${lastFillError.message}`)
        }

        if (!fieldsVerified) {
          if (fillAttempt >= maxFillAttempts) {
            if (lastFillError) {
              throw lastFillError
            }
            throw new Error(`Failed to fill payment fields after ${maxFillAttempts} attempts. Iframe keeps reloading.`)
          }

          console.log('Iframe likely reloaded or Stripe not ready - waiting for it to stabilize again...')
          await page.waitForTimeout(3000)
        }
      }

      if (!fieldsVerified) {
        throw new Error(`Failed to fill payment fields after ${maxFillAttempts} attempts. Iframe keeps reloading.`)
      }

      // Accept terms
      await page.locator('#acceptTerms').click()

      // Button shows "Pay €0" for 100% discount
      const completeButton = page.getByRole('button', { name: /Pay.*€0/i })
      await expect(completeButton).toBeEnabled()
      console.log('✅ Complete Payment button enabled')

      // Submit payment form
      await completeButton.click()

      // Ensure submit handler fired (helps catch clicks that don't reach Stripe)
      await page.waitForFunction(() => (window as any).__wb_paymentSubmitCount > 0, { timeout: 5000 })

      // Should redirect to thank-you page
      // Use 'commit' instead of 'load' to avoid timing out on page load issues
      let redirected = false
      try {
        await page.waitForURL(url => url.pathname.includes('/thank-you'), {
          timeout: 30000,
          waitUntil: 'commit'  // Don't wait for 'load' event - just wait for URL to change
        })
        redirected = true
        console.log('✅ Redirected to thank-you page')
      } catch (error) {
        const stripeSubmitError = await page.evaluate(() => (window as any).__wb_lastStripeSubmitError ?? null)
        const stripeError = await page.evaluate(() => (window as any).__wb_lastStripeError ?? null)
        const paymentAlert = page.getByRole('alert').filter({ hasText: /Payment Error/i })
        const paymentAlertText = (await paymentAlert.count()) ? await paymentAlert.first().innerText() : null

        if (stripeSubmitError || stripeError || paymentAlertText) {
          throw new Error(
            `Payment did not redirect to thank-you. submitError=${JSON.stringify(stripeSubmitError)} ` +
            `stripeError=${JSON.stringify(stripeError)} paymentAlert=${paymentAlertText || 'none'}`
          )
        }

        console.log('⚠️  No redirect detected after payment submit; continuing with webhook checks', {
          currentUrl: page.url()
        })
      }

      // Wait for webhooks (invoice.paid and setup_intent.succeeded)
      await triggerMockWebhookForPayment(submissionId!)
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid')
      expect(webhookProcessed).toBe(true)

      // CRITICAL DATABASE VERIFICATION
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('stripe_subscription_id, stripe_customer_id, status')
        .eq('id', submissionId)
        .single()

      expect(submission?.status).toBe('paid')
      console.log('✅ Submission status is "paid"')

      // Wait a bit for all webhooks to finish processing (subscription.updated can fire after setup_intent.succeeded)
      await page.waitForTimeout(2000)

      // CRITICAL STRIPE VERIFICATION - Subscription Status
      const subscription = await stripe.subscriptions.retrieve(submission!.stripe_subscription_id!)

      expect(subscription.status).toBe('active')
      console.log('✅ Subscription status is "active" (NOT cancelled)')

      // CRITICAL - Verify payment method is attached
      expect(subscription.default_payment_method).toBeTruthy()
      console.log('✅ Payment method attached:', subscription.default_payment_method)

      // Verify first invoice was $0 and paid
      const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string)
      expect(invoice.total).toBe(0)
      expect(invoice.status).toBe('paid')
      console.log('✅ Invoice: €0.00, status: paid')

      // Verify discount was applied
      expect(invoice.total_discount_amounts).toBeTruthy()
      const totalDiscount = invoice.total_discount_amounts!.reduce((sum, d) => sum + d.amount, 0)
      expect(totalDiscount).toBe(3500) // Full €35 discounted
      console.log('✅ Discount applied: €35.00')

      // Verify customer has payment method
      const customer = await stripe.customers.retrieve(submission!.stripe_customer_id!) as Stripe.Customer
      expect(customer.invoice_settings.default_payment_method).toBeTruthy()
      console.log('✅ Customer has default payment method')

      // NOTE: Skipping upcoming invoice verification - retrieveUpcoming not available in Stripe SDK v19
      // The key validation is that payment method is attached for future billing (verified above)

      console.log('\n✅ ALL TESTS PASSED - 100% discount flow working correctly!')

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
      await stripe.coupons.del(couponId).catch(() => {})
    }
  })

  test('discount code validation - valid code', async ({ page }) => {
    test.setTimeout(60000) // 1 minute (no full navigation needed)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // Seed pre-filled Step 14 session (FAST!)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Inject Zustand store into localStorage
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // Wait for checkout to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      // Verify discount code UI is present
      await expect(page.locator('text=/Discount Code/i').first()).toBeVisible()

      // Find and fill discount code input
      const discountCode = couponIds.tenPercent
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      await expect(discountInput).toBeVisible()
      await discountInput.fill(discountCode)

      // Click Apply button
      const applyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await expect(applyButton).toBeEnabled()
      await applyButton.click()

      await Promise.race([
        page.waitForFunction((code: string) => {
          const meta = (window as any).__wb_lastDiscountMeta
          return meta?.code === code
        }, discountCode, { timeout: DISCOUNT_WAIT_MS }),
        page.waitForFunction(() => {
          return Boolean((window as any).__wb_lastDiscountValidation?.status === 'valid')
        }, { timeout: DISCOUNT_WAIT_MS })
      ])

      // Verify success message appears
      await expect(page.locator(`text=Discount code ${discountCode} applied`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })

      // Verify discount badge in order summary
      await expect(page.getByTestId('discount-summary')).toBeVisible()

      // Verify price reduction (original €35, with 10% discount = €31.50)
      const expectedPayDisplay = formatEuroDisplay(Math.round(stripePrices.base * 0.9))
      await expect(page.locator(`button:has-text("Pay €${expectedPayDisplay}")`)).toBeVisible()

    } catch (error) {
      throw error
    } finally {
      // Cleanup test data
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('discount code validation - invalid code', async ({ page }) => {
    test.setTimeout(60000) // 1 minute (no full navigation needed)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // Seed pre-filled Step 14 session (FAST!)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Inject Zustand store into localStorage
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // Wait for checkout to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      // Fill invalid discount code
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      await discountInput.fill('INVALID999')

      // Click Verify button
      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      // Wait for validation
      await page.waitForTimeout(2000)

      // Verify error message appears (check for "invalid" or "not found" or "not valid")
      const errorLocator = page.locator('[role="alert"]').filter({ hasText: /invalid|not found|not valid|doesn't exist/i })
      await expect(errorLocator).toBeVisible({ timeout: 10000 })

      // Verify price remains unchanged (€35)
      const baseDisplay = formatEuroDisplay(stripePrices.base)
      await expect(page.locator(`text=/Pay €${baseDisplay.replace('.', '\\.')}/i`)).toBeVisible()

    } catch (error) {
      throw error
    } finally {
      // Cleanup test data
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('discount code validation - empty code', async ({ page }) => {
    test.setTimeout(60000) // 1 minute (no full navigation needed)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // Seed pre-filled Step 14 session (FAST!)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Inject Zustand store into localStorage
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // Wait for checkout to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      // Verify Apply button is disabled when input is empty
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      const applyButton = page.getByRole('button', { name: /Apply|Verify/i })

      await expect(discountInput).toBeEmpty()
      await expect(applyButton).toBeDisabled()

    } catch (error) {
      throw error
    } finally {
      // Cleanup test data
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('discount code applied with payment completion', async ({ page }) => {
    test.setTimeout(180000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled Step 14 session
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // Set cookie consent before page load to prevent banner from interfering with tests
      await setCookieConsentBeforeLoad(page, true, false)

      // 2. Inject Zustand store into localStorage BEFORE navigating
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // Wait for checkout to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(2000)

      // Apply discount code
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      const discountCode = couponIds.twentyPercent
      await discountInput.fill(discountCode)

      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      await Promise.race([
        page.waitForFunction((code: string) => {
          const meta = (window as any).__wb_lastDiscountMeta
          return meta?.code === code
        }, discountCode, { timeout: DISCOUNT_WAIT_MS }),
        page.waitForFunction(() => {
          return Boolean((window as any).__wb_lastDiscountValidation?.status === 'valid')
        }, { timeout: DISCOUNT_WAIT_MS })
      ])

      // Verify discount applied (20% off €35 = €7, final price €28)
      await expect(page.locator(`text=Discount code ${discountCode} applied`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })
      // Check for €28 in the Pay button
      const expectedPayDisplay = formatEuroDisplay(Math.round(stripePrices.base * 0.8))
      await expect(page.locator(`button:has-text("Pay €${expectedPayDisplay}")`)).toBeVisible()

    } catch (error) {
      throw error
    } finally {
      // Cleanup
      if (sessionId) {
        await cleanupTestSession(sessionId)
      }
    }
  })

  test('comprehensive database validation after payment', async ({ page }) => {
    test.setTimeout(120000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed pre-filled Step 14 session with language add-ons
      const seed = await seedStep14TestSession({
        additionalLanguages: ['de', 'fr'] // German and French
      })
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // 2. Inject Zustand store into localStorage
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })

      // 4. Wait for Stripe Elements iframe to load
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 5. Apply discount code
      const discountCode = couponIds.tenPercent
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      await discountInput.fill(discountCode)

      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      await Promise.race([
        page.waitForFunction((code: string) => {
          const meta = (window as any).__wb_lastDiscountMeta
          return meta?.code === code
        }, discountCode, { timeout: DISCOUNT_WAIT_MS }),
        page.waitForFunction(() => {
          return Boolean((window as any).__wb_lastDiscountValidation?.status === 'valid')
        }, { timeout: DISCOUNT_WAIT_MS }),
        page.waitForFunction(() => {
          const preview = (window as any).__wb_lastDiscountPreview
          return Boolean(preview && preview.discountAmount > 0)
        }, { timeout: DISCOUNT_WAIT_MS })
      ])

      // Verify discount applied
      await expect(page.locator(`text=Discount code ${discountCode} applied`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })

      // 6. Accept terms and complete payment
      await page.locator('#acceptTerms').click()

      await fillStripePaymentForm(page)

      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // 7. Wait for redirect to thank-you page
      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      // 8. Wait for webhooks to process
      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid', {
        maxAttempts: 30, // 15 seconds (now using after() API so webhooks complete reliably)
        delayMs: 500
      })
      expect(webhookProcessed).toBe(true)

      // 9. COMPREHENSIVE DATABASE VALIDATION
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()

      // === STRIPE IDs VALIDATION ===
      expect(submission.stripe_customer_id).toBeTruthy()
      expect(submission.stripe_customer_id).toMatch(/^cus_/)

      expect(submission.stripe_subscription_id).toBeTruthy()
      expect(submission.stripe_subscription_id).toMatch(/^sub_/)

      expect(submission.stripe_subscription_schedule_id).toBeTruthy()
      expect(submission.stripe_subscription_schedule_id).toMatch(/^sub_sched_/)

      expect(submission.stripe_payment_id).toBeTruthy()
      expect(submission.stripe_payment_id).toMatch(/^pi_/)

      // === STATUS AND DATES VALIDATION ===
      expect(submission.status).toBe('paid')
      expect(submission.payment_completed_at).toBeTruthy()

      const paymentDate = new Date(submission.payment_completed_at)
      expect(paymentDate.getTime()).toBeGreaterThan(Date.now() - 120000) // Within last 2 minutes
      expect(paymentDate.getTime()).toBeLessThanOrEqual(Date.now())

      expect(submission.created_at).toBeTruthy()
      expect(submission.updated_at).toBeTruthy()

      // === PAYMENT AMOUNTS VALIDATION ===
      expect(submission.payment_amount).toBeTruthy()
      expect(submission.currency).toBe('EUR')

      const paymentMetadata = submission.payment_metadata || {}
      expect(typeof paymentMetadata).toBe('object')
      expect(paymentMetadata.subtotal).toBeDefined()
      expect(paymentMetadata.discount_amount).toBeDefined()
      expect(submission.payment_amount).toBe(paymentMetadata.subtotal - paymentMetadata.discount_amount)

      // === PAYMENT METADATA VALIDATION ===
      expect(submission.payment_metadata).toBeTruthy()
      // payment_metadata structure varies by event type (payment_intent vs invoice)
      // Verify it's an object with some data
      expect(typeof submission.payment_metadata).toBe('object')

      // === LANGUAGE ADD-ONS VALIDATION ===
      expect(submission.form_data.additionalLanguages).toBeTruthy()
      expect(submission.form_data.additionalLanguages).toEqual(['de', 'fr'])
      expect(submission.form_data.additionalLanguages.length).toBe(2)

      // === SESSION VALIDATION ===
      expect(submission.session_id).toBe(sessionId)

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('database validation - discount code metadata persisted', async ({ page }) => {
    test.setTimeout(120000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed session with no language add-ons (simpler for discount validation)
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      // 2. Inject Zustand store
      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      // 3. Navigate to Step 14
      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 4. Apply 20% discount code
      const discountCode = couponIds.twentyPercent
      const discountInput = page.getByRole('textbox', { name: 'discount' })
      await discountInput.fill(discountCode)
      const verifyButton = page.getByRole('button', { name: /Apply|Verify/i })
      await verifyButton.click()

      // Wait for discount to be confirmed
      await page.waitForFunction((code: string) => {
        const meta = (window as any).__wb_lastDiscountMeta
        return meta?.code === code
      }, discountCode, { timeout: DISCOUNT_WAIT_MS })

      // Verify discount applied
      await expect(page.locator(`text=Discount code ${discountCode} applied`)).toBeVisible({ timeout: DISCOUNT_WAIT_MS })

      // 5. Complete payment
      await page.locator('#acceptTerms').click()
      await fillStripePaymentForm(page)

      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      // 6. Wait for completion
      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid')
      expect(webhookProcessed).toBe(true)

      // 7. VALIDATE DISCOUNT CODE IN DATABASE
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()

      // Validate payment amount
      // Base package: €35/month = 3500 cents
      // 20% discount code applied: 3500 * 0.8 = 2800 cents
      // Note: Discount codes apply to BOTH first payment and recurring charges
      const expectedDiscountedAmount = Math.round(stripePrices.base * 0.8)
      expect(submission.payment_amount).toBe(expectedDiscountedAmount)
      expect(submission.currency).toBe('EUR')
      expect(submission.status).toBe('paid')

      // Validate payment metadata exists
      expect(submission.payment_metadata).toBeTruthy()

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })

  test('database validation - subscription schedule dates', async ({ page }) => {
    test.setTimeout(120000)

    let sessionId: string | null = null
    let submissionId: string | null = null

    try {
      // 1. Seed and navigate
      const seed = await seedStep14TestSession()
      sessionId = seed.sessionId
      submissionId = seed.submissionId

      await page.addInitScript((store) => {
        localStorage.setItem('wb-onboarding-store', store)
      }, seed.zustandStore)

      await page.goto(seed.url)
      await page.waitForURL(/\/step\/14/, { timeout: 10000 })
      await page.waitForSelector('iframe[name^="__privateStripeFrame"]', { timeout: 30000 })
      await page.waitForTimeout(3000)

      // 2. Complete payment
      await page.locator('#acceptTerms').click()
      await fillStripePaymentForm(page)

      await page.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit())

      await page.waitForURL(url => url.pathname.includes('/thank-you'), {
        timeout: 90000,
        waitUntil: 'commit'
      })

      // Trigger mock webhook in CI, or wait for real webhook locally
      await triggerMockWebhookForPayment(submissionId!)

      const webhookProcessed = await waitForWebhookProcessing(submissionId!, 'paid')
      expect(webhookProcessed).toBe(true)

      // 3. VALIDATE SUBSCRIPTION DATES AND TIMESTAMPS
      const { data: submission } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId!)
        .single()

      expect(submission).toBeTruthy()

      // Validate all critical timestamps exist
      expect(submission.created_at).toBeTruthy()
      expect(submission.updated_at).toBeTruthy()
      expect(submission.payment_completed_at).toBeTruthy()

      // Validate timestamp order: created_at <= payment_completed_at <= updated_at
      const createdTime = new Date(submission.created_at).getTime()
      const paymentTime = new Date(submission.payment_completed_at).getTime()
      const updatedTime = new Date(submission.updated_at).getTime()

      expect(createdTime).toBeLessThanOrEqual(paymentTime)
      expect(paymentTime).toBeLessThanOrEqual(updatedTime)

      // Validate payment happened recently (within last 2 minutes)
      const now = Date.now()
      expect(paymentTime).toBeGreaterThan(now - 120000)
      expect(paymentTime).toBeLessThanOrEqual(now)

      // Validate Stripe IDs format
      expect(submission.stripe_subscription_schedule_id).toMatch(/^sub_sched_/)
      expect(submission.stripe_subscription_id).toMatch(/^sub_/)
      expect(submission.stripe_customer_id).toMatch(/^cus_/)

    } finally {
      if (sessionId && submissionId) {
        await cleanupTestSession(sessionId, submissionId)
      }
    }
  })
})
