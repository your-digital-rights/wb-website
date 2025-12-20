/**
 * Checkout Session Service
 * Business logic for creating checkout sessions
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { EUROPEAN_LANGUAGES, isValidLanguageCode } from '@/data/european-languages'
import { StripePaymentService } from './StripePaymentService'
import {
  CreateSessionParams,
  SubmissionValidationResult,
  CustomerInfo,
  CheckoutSessionResult,
  PricingSummary,
  RateLimitResult,
  OnboardingSubmissionRecord
} from './types'
import Stripe from 'stripe'

export class CheckoutSessionService {
  private stripeService: StripePaymentService

  constructor(stripeService?: StripePaymentService) {
    this.stripeService = stripeService || new StripePaymentService()
  }

  private async cancelPendingStripeResources(
    submission: OnboardingSubmissionRecord,
    supabaseClient: SupabaseClient
  ): Promise<OnboardingSubmissionRecord> {
    const stripe = this.stripeService.getStripeInstance()

    console.log('Cancelling pending Stripe resources for submission', {
      submissionId: submission.id,
      stripe_subscription_id: submission.stripe_subscription_id,
      stripe_subscription_schedule_id: submission.stripe_subscription_schedule_id
    })

    const scheduleId = submission.stripe_subscription_schedule_id as string | null
    const subscriptionId = submission.stripe_subscription_id as string | null

    const isResourceMissing = (err: unknown) => {
      if (err && typeof err === 'object' && 'code' in err) {
        const stripeError = err as { code?: string }
        return stripeError.code === 'resource_missing'
      }
      return false
    }

    if (scheduleId) {
      try {
        await stripe.subscriptionSchedules.cancel(scheduleId, {
          invoice_now: false,
          prorate: false
        })
      } catch (error) {
        if (isResourceMissing(error)) {
          console.warn('Subscription schedule already missing during reset, skipping cancel', {
            scheduleId,
            submissionId: submission.id
          })
        } else {
          console.error('Failed to cancel subscription schedule during reset:', error)
        }
      }
    }

    if (subscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscriptionId, {
          invoice_now: false,
          prorate: false
        })
      } catch (error) {
        if (isResourceMissing(error)) {
          console.warn('Subscription already missing during reset, skipping cancel', {
            subscriptionId,
            submissionId: submission.id
          })
        } else {
          console.error('Failed to cancel subscription during reset:', error)
        }
      }
    }

    const { data: updatedSubmission, error: cleanupError } = await supabaseClient
      .from('onboarding_submissions')
      .update({
        stripe_subscription_id: null,
        stripe_subscription_schedule_id: null,
        stripe_payment_id: null,
        payment_amount: null,
        payment_completed_at: null,
        payment_metadata: null,
        status: submission.status === 'paid' ? 'submitted' : submission.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', submission.id)
      .select('*')
      .single()

    if (cleanupError || !updatedSubmission) {
      console.error('Failed to reset submission state during cancel', cleanupError)
      return {
        ...submission,
        stripe_subscription_id: null,
        stripe_subscription_schedule_id: null,
        stripe_payment_id: null,
        payment_amount: null,
        payment_completed_at: null,
        payment_metadata: null,
        status: submission.status === 'paid' ? 'submitted' : submission.status
      }
    }

    return updatedSubmission
  }

  /**
   * Validate submission and check if it's eligible for payment
   *
   * @param submissionId - Onboarding submission ID
   * @param supabaseClient - Supabase client
   * @returns Validation result with submission data or error
   */
  async validateSubmission(
    submissionId: string,
    supabaseClient: SupabaseClient
  ): Promise<SubmissionValidationResult> {
    // Fetch submission from database
    let submission: OnboardingSubmissionRecord | null = null
    let fetchError: unknown = null

    for (let attempt = 0; attempt < 2 && !submission; attempt++) {
      const { data, error } = await supabaseClient
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionId)
        .single()

      if (data) {
        submission = data
        break
      }

      fetchError = error

      if (error?.code !== 'PGRST116') {
        break
      }

      await new Promise(resolve => setTimeout(resolve, 250))
    }

    if (!submission) {
      console.error('CheckoutSessionService.validateSubmission failed', {
        submissionId,
        fetchError
      })
      return {
        valid: false,
        error: {
          code: 'INVALID_SUBMISSION_ID',
          message: 'Submission not found or not in submitted status',
          status: 400
        }
      }
    }

    // Check if subscription already exists
    if (submission.stripe_subscription_id) {
      // Subscription exists - need to check if payment is pending or completed
      // We'll return the submission and let createCheckoutSession handle retrieving
      // the existing client secret if payment is still pending
      console.log('CheckoutSessionService.validateSubmission existing subscription', {
        submissionId,
        stripe_subscription_id: submission.stripe_subscription_id
      })
      return {
        valid: true,
        submission,
        existingSubscription: true
      }
    }

    console.log('CheckoutSessionService.validateSubmission success', {
      submissionId
    })

    return {
      valid: true,
      submission,
      existingSubscription: false
    }
  }

  /**
   * Validate language codes
   *
   * @param languageCodes - Array of language codes to validate
   * @returns Invalid language codes or empty array if all valid
   */
  validateLanguageCodes(languageCodes: string[]): string[] {
    return languageCodes.filter(code => !isValidLanguageCode(code))
  }

  /**
   * Check rate limiting for payment attempts
   *
   * @param sessionId - Onboarding session ID
   * @param supabaseClient - Supabase client
   * @returns Rate limit status
   */
  async checkRateLimit(
    sessionId: string,
    supabaseClient: SupabaseClient
  ): Promise<RateLimitResult> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { count: recentAttempts } = await supabaseClient
      .from('onboarding_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('event_type', 'payment_attempt')
      .gte('created_at', oneHourAgo)

    const maxAttempts = 5
    const allowed = !recentAttempts || recentAttempts < maxAttempts

    return {
      allowed,
      attemptsRemaining: allowed ? maxAttempts - (recentAttempts || 0) : 0,
      resetAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
    }
  }

  /**
   * Log a payment attempt
   *
   * @param sessionId - Onboarding session ID
   * @param submissionId - Submission ID
   * @param languageCount - Number of language add-ons
   * @param supabaseClient - Supabase client
   */
  async logPaymentAttempt(
    sessionId: string,
    submissionId: string,
    languageCount: number,
    supabaseClient: SupabaseClient
  ): Promise<void> {
    await supabaseClient.from('onboarding_analytics').insert({
      session_id: sessionId,
      event_type: 'payment_attempt',
      event_data: {
        submission_id: submissionId,
        language_count: languageCount
      }
    })
  }

  /**
   * Extract customer information from submission
   *
   * @param submission - Onboarding submission data
   * @returns Customer email and business name
   * @throws Error if customer email not found
   */
  extractCustomerInfo(submission: OnboardingSubmissionRecord): CustomerInfo {
    // Try multiple locations for email (form data structure changes over time)
    const customerEmail = submission.form_data?.email ||
                         submission.form_data?.businessEmail ||
                         submission.form_data?.step3?.businessEmail ||
                         submission.email

    const businessName = submission.form_data?.businessName ||
                        submission.form_data?.step3?.businessName ||
                        submission.business_name

    if (!customerEmail) {
      throw new Error('MISSING_CUSTOMER_EMAIL: Customer email not found in submission')
    }

    return {
      email: customerEmail,
      businessName: businessName || 'Unknown Business'
    }
  }

  /**
   * Create a complete checkout session with payment intent
   *
   * @param params - Session creation parameters
   * @param supabaseClient - Supabase client
   * @returns Checkout session result with client secret
   */
  async createCheckoutSession(
    params: CreateSessionParams,
    supabaseClient: SupabaseClient
  ): Promise<CheckoutSessionResult> {
    const {
      submissionId,
      additionalLanguages = [],
      discountCode
    } = params

    try {
      // 1. Validate submission
      const validationResult = await this.validateSubmission(submissionId, supabaseClient)
      if (!validationResult.valid || !validationResult.submission) {
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: validationResult.error
        }
      }
      let submission = validationResult.submission

      if (!submission.session_id) {
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'MISSING_SESSION_ID',
            message: 'Session ID not found for submission'
          }
        }
      }
      const sessionId = submission.session_id

      // 1b. Extract additionalLanguages from submission's form_data (source of truth)
      // The frontend may pass additionalLanguages, but we should trust the database
      const formLanguages = submission.form_data?.step13?.additionalLanguages || submission.form_data?.additionalLanguages || []
      const submissionLanguages = Array.isArray(formLanguages)
        ? [...new Set(formLanguages.filter((code: unknown): code is string => typeof code === 'string'))]
        : []
      const fallbackLanguages = Array.isArray(additionalLanguages)
        ? [...new Set(additionalLanguages.filter((code: unknown): code is string => typeof code === 'string'))]
        : []
      const languagesToUse = submissionLanguages.length > 0 ? submissionLanguages : fallbackLanguages

      // 1a. Handle existing subscription - retrieve existing client secret
      if (validationResult.existingSubscription && submission.stripe_subscription_id) {
        console.warn('Existing subscription detected – resetting Stripe resources')
        submission = await this.cancelPendingStripeResources(submission, supabaseClient)
        validationResult.submission = submission
        validationResult.existingSubscription = false
      }

      // 2. Validate language codes
      const invalidLanguages = this.validateLanguageCodes(languagesToUse)
      if (invalidLanguages.length > 0) {
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'INVALID_LANGUAGE_CODE',
            message: `Invalid language codes: ${invalidLanguages.join(', ')}`
          }
        }
      }

      // 3. Check rate limiting
      const rateLimitResult = await this.checkRateLimit(sessionId, supabaseClient)
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many payment attempts. Please try again in 1 hour.'
          }
        }
      }

      // 4. Log payment attempt
      await this.logPaymentAttempt(
        sessionId,
        submissionId,
        languagesToUse.length,
        supabaseClient
      )

      // 5. Extract customer information
      const customerInfo = this.extractCustomerInfo(submission)

      // 6. Create or retrieve Stripe customer
      const customer = await this.stripeService.findOrCreateCustomer(
        customerInfo.email,
        customerInfo.businessName,
        {
          submission_id: submissionId,
          session_id: sessionId
        }
      )

      // 7. Validate discount code if provided
      let validatedCoupon: Stripe.Coupon | null = null
      if (discountCode) {
        validatedCoupon = await this.stripeService.validateCoupon(discountCode)
        console.log('[CheckoutSessionService] coupon validation result', {
          discountCode,
          validatedCoupon: validatedCoupon ? { id: validatedCoupon.id, valid: validatedCoupon.valid, duration: validatedCoupon.duration } : null
        })
        if (!validatedCoupon) {
          return {
            success: false,
            paymentRequired: true,
            clientSecret: null,
            error: {
              code: 'INVALID_DISCOUNT_CODE',
              message: `Discount code '${discountCode}' is not valid or has expired`
            }
          }
        }
      }


      // Persist discount code in form data for auditing/UI
      if (validatedCoupon && discountCode) {
        const updatedFormData = {
          ...(submission.form_data || {})
        }
        updatedFormData.discountCode = discountCode
        updatedFormData.step14 = {
          ...(updatedFormData.step14 || {}),
          discountCode
        }
        submission.form_data = updatedFormData
      } else if (!discountCode && submission.form_data?.discountCode) {
        const updatedFormData = {
          ...(submission.form_data || {})
        }
        delete updatedFormData.discountCode
        if (updatedFormData.step14) {
          delete updatedFormData.step14.discountCode
        }
        submission.form_data = updatedFormData
      }

      // 8. Create subscription schedule with 12-month commitment
      const scheduleResult = await this.stripeService.createSubscriptionSchedule({
        customerId: customer.id,
        priceId: process.env.STRIPE_BASE_PACKAGE_PRICE_ID!,
        couponId: validatedCoupon?.id,
        metadata: {
          submission_id: submissionId,
          session_id: sessionId,
          commitment_months: '12'
        }
      })

      const { schedule, subscription } = scheduleResult

      if (!subscription) {
        throw new Error('Subscription not created by schedule')
      }

      const stripe = this.stripeService.getStripeInstance()
      const subscriptionMetadata = {
        ...(subscription.metadata || {}),
        submission_id: submissionId,
        session_id: sessionId,
        additional_languages: languagesToUse.join(','),
        commitment_months: '12',
        ...(validatedCoupon ? { discount_code: validatedCoupon.id } : {})
      }

      let metadataUpdateError: unknown = null
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await stripe.subscriptions.update(subscription.id, {
            metadata: subscriptionMetadata,
            payment_settings: {
              save_default_payment_method: 'on_subscription'
            },
            automatic_tax: {
              enabled: true
            }
          })
          metadataUpdateError = null
          break
        } catch (error) {
          metadataUpdateError = error
          if (attempt < 1) {
            await new Promise(resolve => setTimeout(resolve, 300))
          }
        }
      }

      if (metadataUpdateError) {
        console.error('Failed to update subscription metadata:', metadataUpdateError)
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'SUBSCRIPTION_METADATA_UPDATE_FAILED',
            message: 'Failed to update subscription metadata. Please try again.'
          }
        }
      }

      // 9. Add language add-ons as invoice items (use database value)
      const addOnResult = await this.addLanguageAddOns(
        customer.id,
        subscription,
        languagesToUse,
        submissionId,
        sessionId,
        validatedCoupon?.id ?? null,
        supabaseClient
      )

      console.log('[CheckoutSessionService] addLanguageAddOns result', {
        submissionId,
        invoiceId: addOnResult.invoiceId,
        paymentRequired: addOnResult.paymentRequired,
        couponId: validatedCoupon?.id || null,
        invoiceTotal: addOnResult.invoiceTotal,
        invoiceDiscount: addOnResult.invoiceDiscount,
        paymentIntentId: addOnResult.paymentIntentId || null
      })

      // 10. Update submission with Stripe IDs (including payment intent ID for mock webhooks)
      let updateError: any = null
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabaseClient
          .from('onboarding_submissions')
          .update({
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            stripe_subscription_schedule_id: schedule.id,
            stripe_payment_id: addOnResult.paymentIntentId || null,
            stripe_invoice_id: addOnResult.invoiceId || null,
            payment_summary: addOnResult.pricingSummary || null,
            payment_tax_amount: addOnResult.taxAmount ?? null,
            payment_tax_currency: addOnResult.taxCurrency ?? null,
            form_data: submission.form_data,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)

        if (!error) {
          updateError = null
          break
        }

        updateError = error
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      if (updateError) {
        console.error('[CheckoutSessionService] Failed to update submission with Stripe IDs:', updateError)
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'SUBMISSION_UPDATE_FAILED',
            message: 'Failed to persist checkout session. Please try again.'
          }
        }
      }

      console.log('[CheckoutSessionService] Updated submission with Stripe IDs', {
        submissionId,
        customerId: customer.id,
        subscriptionId: subscription.id,
        scheduleId: schedule.id,
        paymentIntentId: addOnResult.paymentIntentId || null
      })

      console.log('[CheckoutSessionService] returning session creation result', {
        submissionId,
        paymentRequired: addOnResult.paymentRequired,
        clientSecret: addOnResult.clientSecret ? 'present' : null,
        invoiceId: addOnResult.invoiceId
      })

      return {
        success: true,
        paymentRequired: addOnResult.paymentRequired,
        clientSecret: addOnResult.clientSecret,
        invoiceId: addOnResult.invoiceId,
        customerId: customer.id,
        subscriptionId: subscription.id,
        subscriptionScheduleId: schedule.id,
        paymentIntentId: addOnResult.paymentIntentId ?? null,
        pricingSummary: addOnResult.pricingSummary,
        taxAmount: addOnResult.taxAmount,
        taxCurrency: addOnResult.taxCurrency,
        invoiceTotal: addOnResult.invoiceTotal,
        invoiceDiscount: addOnResult.invoiceDiscount,
        couponId: validatedCoupon?.id ?? null
      }
    } catch (error) {
      console.error('Checkout session creation error:', error)

      // Check for specific error types
      if (error instanceof Error && error.message.startsWith('MISSING_CUSTOMER_EMAIL')) {
        return {
          success: false,
          paymentRequired: true,
          clientSecret: null,
          error: {
            code: 'MISSING_CUSTOMER_EMAIL',
            message: 'Customer email not found in submission'
          }
        }
      }

      return {
        success: false,
        paymentRequired: true,
        clientSecret: null,
        error: {
          code: 'STRIPE_API_ERROR',
          message: 'Failed to create checkout session. Please try again.'
        }
      }
    }
  }

  /**
   * Add language add-ons to the subscription invoice
   *
   * @param supabaseClient - Supabase client for persistence when needed
   * @private
  */
  private async addLanguageAddOns(
    customerId: string,
    subscription: Stripe.Subscription,
    languageCodes: string[],
    submissionId: string,
    sessionId: string,
    couponId: string | null,
    supabaseClient: SupabaseClient
  ): Promise<{
    paymentRequired: boolean
    clientSecret: string | null
    invoiceId: string
    invoiceTotal: number
    invoiceDiscount: number
    paymentIntentId?: string | null
    pricingSummary?: PricingSummary
    taxAmount?: number
    taxCurrency?: string
  }> {
    const stripe = this.stripeService.getStripeInstance()

    // Get the invoice ID from the subscription
    let invoiceId: string
    if (typeof subscription.latest_invoice === 'string') {
      invoiceId = subscription.latest_invoice
    } else if (subscription.latest_invoice?.id) {
      invoiceId = subscription.latest_invoice.id
    } else {
      throw new Error('No invoice found for subscription')
    }

    // Fetch language add-on price from Stripe
    const languageAddonPriceId = process.env.STRIPE_LANGUAGE_ADDON_PRICE_ID!
    const addonPrice = await stripe.prices.retrieve(languageAddonPriceId)

    // Add language add-ons as invoice items
    const languageAddOnPromises = languageCodes.map((code: string) => {
      const language = EUROPEAN_LANGUAGES.find(l => l.code === code)
      return stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoiceId,
        pricing: {
          price: addonPrice.id
        },
        description: `${language?.nameEn} Language Add-on`,
        metadata: {
          language_code: code,
          one_time: 'true'
        }
      })
    })

    await Promise.all(languageAddOnPromises)

    try {
      const invoiceUpdate: Stripe.InvoiceUpdateParams = {
        metadata: {
          submission_id: submissionId,
          session_id: sessionId,
          is_initial_payment: 'true'
        }
      }

      if (couponId) {
        invoiceUpdate.discounts = [{ coupon: couponId }]
      }

      await stripe.invoices.update(invoiceId, invoiceUpdate)
    } catch (invoiceUpdateError) {
      console.error('Failed to update invoice metadata or discounts:', invoiceUpdateError)
    }

    // Finalize the invoice to create the Payment Intent with discounts automatically applied
    // NOTE: In Stripe API v2025-09-30.clover+, payment_intent is no longer directly on invoice
    // Instead, it's nested in payments array: invoice.payments.data[0].payment.payment_intent
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId, {
      expand: ['confirmation_secret', 'payments', 'total_discount_amounts', 'lines.data.price', 'lines.data.discounts']
    })

    const pricingSummary = this.buildPricingSummary(finalizedInvoice)
    const taxAmount = pricingSummary.taxAmount

    console.log('[CheckoutSessionService] finalized invoice', {
      invoiceId: finalizedInvoice.id,
      total: finalizedInvoice.total,
      subtotal: finalizedInvoice.subtotal,
      totalDiscount: (finalizedInvoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0),
      discountAmounts: finalizedInvoice.total_discount_amounts,
      couponId,
      paymentsCount: (finalizedInvoice as any).payments?.data?.length || 0,
      firstPaymentIntentId: (finalizedInvoice as any).payments?.data?.[0]?.payment?.payment_intent
    })

    // Handle zero-amount invoices (discount >= total)
    const invoiceIdValue = finalizedInvoice.id

    if (finalizedInvoice.amount_due <= 0) {
      // For $0 invoices, we must collect payment method for future billing
      // Subscription schedules don't support payment_behavior parameter, so Stripe
      // never auto-creates pending_setup_intent. We must create SetupIntent manually.

      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',  // Allow future automatic charges
        metadata: {
          submission_id: submissionId,
          session_id: sessionId,
          invoice_id: invoiceId,
          subscription_id: subscription.id
        }
      })

      if (!setupIntent.client_secret) {
        throw new Error('SetupIntent created but client_secret is missing')
      }

      const { error: setupIntentIdSaveError } = await supabaseClient
        .from('onboarding_submissions')
        .update({
          stripe_payment_id: setupIntent.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (setupIntentIdSaveError) {
        console.error('Failed to persist SetupIntent ID on submission:', setupIntentIdSaveError)
      }

      console.log('[CheckoutSessionService] Created SetupIntent for $0 invoice', {
        submissionId,
        setupIntentId: setupIntent.id,
        invoiceTotal: 0,
        invoiceDiscount: (finalizedInvoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0)
      })

      return {
        paymentRequired: true,  // Show payment form to collect payment method
        clientSecret: setupIntent.client_secret,  // SetupIntent client_secret
        invoiceId: invoiceIdValue,
        invoiceTotal: 0,
        invoiceDiscount: (finalizedInvoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0),
        paymentIntentId: setupIntent.id,
        pricingSummary,
        taxAmount,
        taxCurrency: finalizedInvoice.currency
      }
    }

    // Extract PaymentIntent ID from the payments array (Stripe API v2025-09-30.clover+)
    // In newer Stripe APIs, payment_intent is nested in: invoice.payments.data[0].payment.payment_intent
    const paymentsData = (finalizedInvoice as any).payments?.data
    const firstPayment = paymentsData?.[0]?.payment
    let paymentIntentId = typeof firstPayment?.payment_intent === 'string'
      ? firstPayment.payment_intent
      : firstPayment?.payment_intent?.id

    if (paymentIntentId) {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          submission_id: submissionId,
          session_id: sessionId,
          invoice_id: invoiceId
        }
      })
    }

    // Use the invoice's confirmation_secret which contains the PaymentIntent client_secret
    // Stripe automatically creates this during finalization with discounts applied
    const confirmationSecret = finalizedInvoice.confirmation_secret

    // In Stripe API v2025-09-30.clover, finalizeInvoice often returns before payments populate.
    // When that happens we can still derive the PaymentIntent ID from the client_secret
    // returned in confirmation_secret (format: pi_xxx_secret_yyy).
    if (!paymentIntentId && confirmationSecret?.client_secret) {
      const secret = confirmationSecret.client_secret
      const secretPrefix = secret.split('_secret_')[0]
      if (secretPrefix && secretPrefix.startsWith('pi_')) {
        paymentIntentId = secretPrefix
      }
    }

    if (!confirmationSecret?.client_secret) {
      throw new Error('Invoice confirmation secret not available')
    }

    return {
      paymentRequired: true,
      clientSecret: confirmationSecret.client_secret,
      invoiceId: invoiceIdValue,
      invoiceTotal: finalizedInvoice.total ?? 0,
      invoiceDiscount: (finalizedInvoice.total_discount_amounts || []).reduce((sum, d) => sum + d.amount, 0),
      paymentIntentId: paymentIntentId || null,
      pricingSummary,
      taxAmount,
      taxCurrency: finalizedInvoice.currency
    }
  }

  private buildPricingSummary(invoice: Stripe.Invoice): PricingSummary {
    const basePackagePriceId = process.env.STRIPE_BASE_PACKAGE_PRICE_ID

    const lineItems = (invoice.lines?.data || []).map((line) => {
      const lineRecord = line as Stripe.InvoiceLineItem & {
        price?: Stripe.Price | string | null
        type?: string
      }
      const discountAmount = (line.discount_amounts || []).reduce((sum, discount) => sum + discount.amount, 0)
      const amount = line.amount ?? 0
      const quantity = line.quantity ?? 1
      const lineAmountTotal = (line as { amount_total?: number }).amount_total
      const finalAmount = typeof lineAmountTotal === 'number'
        ? lineAmountTotal
        : Math.max(amount - discountAmount, 0)
      const unitAmount = typeof lineRecord.price === 'object' ? lineRecord.price?.unit_amount ?? null : null
      const priceId = typeof lineRecord.price === 'string' ? lineRecord.price : lineRecord.price?.id
      const isBasePackageLine = Boolean(
        (basePackagePriceId && priceId === basePackagePriceId)
        || line.description?.includes('WhiteBoar Base Package')
        || line.description?.includes('Base Package')
      )
      const isRecurring = Boolean(line.subscription)
        || Boolean(lineRecord.price && typeof lineRecord.price === 'object' && lineRecord.price.recurring)
        || lineRecord.type === 'subscription'
        || isBasePackageLine
      let originalAmount = typeof lineAmountTotal === 'number' ? finalAmount + discountAmount : amount
      if (typeof unitAmount === 'number' && unitAmount > 0) {
        const priceBaseline = unitAmount * quantity
        if (priceBaseline > originalAmount) {
          originalAmount = priceBaseline
        }
      }
      const derivedLineDiscount = Math.max(originalAmount - finalAmount, 0)
      const lineDiscountAmount = discountAmount > 0 ? discountAmount : derivedLineDiscount

      return {
        id: line.id,
        description: line.description || 'Line item',
        amount: finalAmount,
        originalAmount,
        quantity,
        discountAmount: lineDiscountAmount,
        isRecurring
      }
    })

    const recurringAmount = lineItems
      .filter((item) => item.isRecurring)
      .reduce((sum, item) => sum + item.amount, 0)
    const recurringDiscount = lineItems
      .filter((item) => item.isRecurring)
      .reduce((sum, item) => sum + item.discountAmount, 0)

    const taxAmount = ((invoice as any).total_tax_amounts || []).reduce((sum: number, tax: { amount: number }) => sum + tax.amount, 0)
    const lineDiscountTotal = lineItems.reduce((sum, item) => sum + item.discountAmount, 0)
    const invoiceDiscountTotal = ((invoice as any).total_discount_amounts || []).reduce((sum: number, discount: { amount: number }) => sum + discount.amount, 0)
    const subtotal = invoice.subtotal ?? 0
    const total = invoice.total ?? 0
    const derivedDiscount = Math.max(subtotal + taxAmount - total, 0)
    const discountAmount = invoiceDiscountTotal > 0
      ? invoiceDiscountTotal
      : (lineDiscountTotal > 0 ? lineDiscountTotal : derivedDiscount)

    return {
      subtotal,
      total,
      discountAmount,
      recurringAmount,
      recurringDiscount,
      taxAmount,
      currency: invoice.currency ?? 'eur',
      lineItems
    }
  }
}
