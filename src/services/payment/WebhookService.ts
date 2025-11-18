/**
 * Webhook Service
 * Handles all Stripe webhook events
 */

import Stripe from 'stripe'
import { SupabaseClient } from '@supabase/supabase-js'
import { EmailService } from '@/services/resend'
import { SubmissionLookupResult, WebhookHandlerResult } from './types'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.NOTIFICATION_ADMIN_EMAIL
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Safe logging helper
function debugLog(message: string, data?: unknown) {
  if (!IS_PRODUCTION) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

export class WebhookService {
  private stripe: Stripe

  constructor(stripeInstance?: Stripe) {
    if (stripeInstance) {
      this.stripe = stripeInstance
    } else {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-09-30.clover'
      })
    }
  }

  private async getInvoiceFromEvent(event: Stripe.Event): Promise<Stripe.Invoice | null> {
    const eventData = event.data.object as any

    // Direct invoice object on legacy events
    if (eventData?.object === 'invoice') {
      return eventData as Stripe.Invoice
    }

    // New invoice payment events contain an invoice reference
    const invoiceId = typeof eventData?.invoice === 'string'
      ? eventData.invoice
      : eventData?.invoice?.id

    if (invoiceId) {
      try {
        return await this.stripe.invoices.retrieve(invoiceId, {
          expand: [
            'line_items',
            'total_discount_amounts',
            'customer',
            'subscription',
            'payments.data.payment',
            'discounts.data.coupon'
          ]
        })
      } catch (error) {
        debugLog(`Failed to retrieve invoice ${invoiceId}:`, error)
      }
    }

    return null
  }

  /**
   * Find submission by various lookup strategies
   *
   * @param event - Stripe event
   * @param supabase - Supabase client
   * @returns Submission and lookup method used
   */
  async findSubmissionByEvent(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<SubmissionLookupResult> {
    const eventData = event.data.object as any

    let scheduleId: string | null = null
    let customerId: string | null = null
    let subscriptionId: string | null = null
    let submissionIdFromMetadata: string | undefined
    let paymentIntentId: string | null = null

    const invoiceFromEvent = await this.getInvoiceFromEvent(event)

    // Extract IDs based on event type
    if (event.type.includes('subscription')) {
      subscriptionId = eventData.id
      customerId = typeof eventData.customer === 'string'
        ? eventData.customer
        : eventData.customer?.id ?? null
      scheduleId = eventData.schedule as string | null
      submissionIdFromMetadata = eventData.metadata?.submission_id
    } else if (event.type.includes('invoice')) {
      const invoice = invoiceFromEvent

      if (invoice) {
        const invoiceSubscriptionRaw = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
        const invoiceSubscription = invoiceSubscriptionRaw ?? null
        subscriptionId = typeof invoiceSubscription === 'string'
          ? invoiceSubscription
          : invoiceSubscription?.id ?? null
        customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id ?? null

        submissionIdFromMetadata = invoice.metadata?.submission_id

        const invoicePaymentIntent = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent ?? null
        if (typeof invoicePaymentIntent === 'string') {
          paymentIntentId = invoicePaymentIntent
        } else if (invoicePaymentIntent?.id) {
          paymentIntentId = invoicePaymentIntent.id
        }

        if (subscriptionId) {
          try {
            const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
            scheduleId = subscription.schedule as string | null
            if (!submissionIdFromMetadata) {
              submissionIdFromMetadata = subscription.metadata?.submission_id
            }
          } catch (error) {
            debugLog(`Failed to retrieve subscription ${subscriptionId}:`, error)
          }
        }
      }
    } else if (event.type.includes('payment_intent')) {
      // For payment_intent events
      customerId = typeof eventData.customer === 'string'
        ? eventData.customer
        : eventData.customer?.id ?? null
      submissionIdFromMetadata = eventData.metadata?.submission_id

      // Try to get subscription info from metadata or by retrieving the PaymentIntent
      if (customerId) {
        try {
          const paymentIntent = await this.stripe.paymentIntents.retrieve(eventData.id, {
            expand: ['invoice']
          }) as Stripe.Response<Stripe.PaymentIntent> & { invoice?: Stripe.Invoice | string }

          // Check if invoice is expanded (not just a string ID)
          if (paymentIntent.invoice && typeof paymentIntent.invoice !== 'string') {
            const invoice = paymentIntent.invoice
            // Invoice.subscription can be string | Subscription | null
            const invoiceSubscriptionRaw = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription
            const invoiceSubscription = invoiceSubscriptionRaw ?? null
            subscriptionId = typeof invoiceSubscription === 'string'
              ? invoiceSubscription
              : invoiceSubscription?.id ?? null

            if (subscriptionId) {
              const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
              scheduleId = subscription.schedule as string | null
            }
          }
        } catch (error) {
          debugLog(`Failed to retrieve payment intent details:`, error)
        }
      }
    }

    // Strategy 1: Try to find by subscription schedule ID
    if (scheduleId) {
      const { data } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('stripe_subscription_schedule_id', scheduleId)
        .single()

      if (data) {
        return { submission: data, foundBy: 'schedule_id' }
      }
    }

    // Strategy 2: Try to find by customer ID
    if (customerId) {
      const { data } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('stripe_customer_id', customerId)
        .single()

      if (data) {
        return { submission: data, foundBy: 'customer_id' }
      }
    }

    // Strategy 3: Try to find by subscription ID
    if (subscriptionId) {
      const { data } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (data) {
        return { submission: data, foundBy: 'subscription_id' }
      }
    }

    // Strategy 4: Try to find by submission_id from metadata
    if (submissionIdFromMetadata) {
      const { data } = await supabase
        .from('onboarding_submissions')
        .select('*')
        .eq('id', submissionIdFromMetadata)
        .single()

      if (data) {
        return { submission: data, foundBy: 'metadata' }
      }
    }

    // Strategy 5: Lookup via payment intent metadata (added for invoice_payment events)
    if (paymentIntentId) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId)

        const piSubmissionId = paymentIntent.metadata?.submission_id
        const piCustomerId = typeof paymentIntent.customer === 'string'
          ? paymentIntent.customer
          : paymentIntent.customer?.id

        if (!customerId && piCustomerId) {
          const { data } = await supabase
            .from('onboarding_submissions')
            .select('*')
            .eq('stripe_customer_id', piCustomerId)
            .single()

          if (data) {
            return { submission: data, foundBy: 'customer_id' }
          }
        }

        if (piSubmissionId) {
          const { data } = await supabase
            .from('onboarding_submissions')
            .select('*')
            .eq('id', piSubmissionId)
            .single()

          if (data) {
            return { submission: data, foundBy: 'metadata' }
          }
        }
      } catch (error) {
        debugLog('Failed to retrieve payment intent during lookup:', error)
      }
    }

    return { submission: null }
  }

  /**
   * Handle invoice.paid event - Payment successful
   */
  async handleInvoicePaid(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const invoice = await this.getInvoiceFromEvent(event)

      if (!invoice) {
        console.error('Invoice details not found for event', event.id)
        return { success: false, error: 'Invoice not found' }
      }

      let invoiceSubscriptionRaw = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription ?? null
      let invoiceCustomerRaw = (invoice as Stripe.Invoice & { customer?: string | Stripe.Customer | null }).customer ?? null

      if (!invoiceSubscriptionRaw && (invoice as any).metadata?.subscription_id) {
        invoiceSubscriptionRaw = (invoice as any).metadata.subscription_id
      }
      if (!invoiceCustomerRaw && (invoice as any).metadata?.customer_id) {
        invoiceCustomerRaw = (invoice as any).metadata.customer_id
      }

      const subscriptionId = typeof invoiceSubscriptionRaw === 'string'
        ? invoiceSubscriptionRaw
        : invoiceSubscriptionRaw?.id ?? null
      const customerId = typeof invoiceCustomerRaw === 'string'
        ? invoiceCustomerRaw
        : invoiceCustomerRaw?.id ?? null
      const invoicePaymentIntentRaw = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent ?? null
      let paymentIntentId = typeof invoicePaymentIntentRaw === 'string'
        ? invoicePaymentIntentRaw
        : invoicePaymentIntentRaw?.id ?? null

      if (!paymentIntentId) {
        const paymentsArray = (invoice as any).payments?.data || []
        const paymentIntentFromPayments = paymentsArray[0]?.payment?.payment_intent
        if (typeof paymentIntentFromPayments === 'string') {
          paymentIntentId = paymentIntentFromPayments
        } else if (paymentIntentFromPayments?.id) {
          paymentIntentId = paymentIntentFromPayments.id
        }
      }

      // Find submission
      const lookupResult = await this.findSubmissionByEvent(event, supabase)
      if (!lookupResult.submission) {
        // If metadata lookup fails, fall back to searching by subscription/customer IDs
        const fallbackQuery = supabase
          .from('onboarding_submissions')
          .select('*')
          .eq('stripe_subscription_id', subscriptionId || '')
          .maybeSingle()
        const { data: fallbackSubmission } = await fallbackQuery
        if (fallbackSubmission) {
          lookupResult.submission = fallbackSubmission
        }
      }

      if (!lookupResult.submission) {
        console.error(`Submission not found for subscription ${subscriptionId}`)
        return { success: false, error: 'Submission not found' }
      }

      const submission = lookupResult.submission
      // Preserve existing schedule_id if already set (don't overwrite with NULL)
      const scheduleId = submission.stripe_subscription_schedule_id || null

      // Extract discount information from invoice
      let discountAmount = 0
      let discountMetadata: any = {}
      let couponId: string | null = null

      // Debug logging for discount extraction
      console.log('[Webhook] DEBUG: Invoice discount info:', {
        total_discount_amounts: invoice.total_discount_amounts,
        discounts: (invoice as any).discounts,
        discount: (invoice as any).discount
      })

      if (invoice.total_discount_amounts && invoice.total_discount_amounts.length > 0) {
        discountAmount = invoice.total_discount_amounts.reduce(
          (sum: number, discount: any) => sum + discount.amount,
          0
        )

        // Try to get coupon ID from invoice discounts
        const invoiceAny = invoice as any
        if (invoiceAny.discounts && invoiceAny.discounts.length > 0) {
          const firstDiscount = invoiceAny.discounts[0]
          console.log('[Webhook] DEBUG: First discount structure:', JSON.stringify(firstDiscount, null, 2))

          // With the expanded discounts, we should have the full discount object with coupon
          if (typeof firstDiscount === 'string') {
            // Still a discount ID, need to fetch it manually
            try {
              const discount = await this.stripe.discounts.retrieve(firstDiscount)
              couponId = discount.coupon.id
              console.log('[Webhook] DEBUG: Retrieved coupon from discount ID:', couponId)
            } catch (error) {
              console.log('[Webhook] DEBUG: Failed to retrieve discount:', error)
            }
          } else if (firstDiscount && firstDiscount.coupon) {
            // Expanded discount with coupon
            couponId = typeof firstDiscount.coupon === 'string' ? firstDiscount.coupon : firstDiscount.coupon.id
            console.log('[Webhook] DEBUG: Got coupon from expanded discount:', couponId)
          } else if (firstDiscount.discount && firstDiscount.discount.coupon) {
            // Nested discount object structure
            couponId = firstDiscount.discount.coupon?.id || firstDiscount.discount.coupon || null
            console.log('[Webhook] DEBUG: Got coupon from nested discount:', couponId)
          }
        }
      }

      // Check customer for discount information if not found in invoice
      if (!couponId && customerId) {
        try {
          const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer & { discount?: Stripe.Discount | null }
          if (customer.discount) {
            couponId = customer.discount.coupon.id
            console.log('[Webhook] DEBUG: Got coupon from customer discount:', couponId)
          }
        } catch (error) {
          debugLog('Failed to retrieve customer for discount info:', error)
        }
      }

      // Get discount details from subscription to determine recurring discount
      let recurringDiscount = 0
      if (subscriptionId) {
        try {
          const subscription = await this.stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription & { discount?: Stripe.Discount | null }

          // Extract discount information from subscription
          const subscriptionAny = subscription as any
          const discount: Stripe.Discount | null = (subscriptionAny.discount
            ?? subscriptionAny.discounts?.data?.[0]
            ?? null) as Stripe.Discount | null

          console.log('[Webhook] DEBUG: Subscription discount info:', {
            discount: discount,
            discountFromProperty: subscriptionAny.discount,
            discountsArray: subscriptionAny.discounts
          })

          if (discount) {
            const coupon = (discount as any).coupon as Stripe.Coupon
            // Use subscription coupon ID if not already found from invoice
            if (!couponId) {
              couponId = coupon.id
            }
            discountMetadata = {
              coupon_id: coupon.id,
              duration: coupon.duration,
              duration_in_months: coupon.duration_in_months,
              percent_off: coupon.percent_off,
              amount_off: coupon.amount_off
            }

            // Calculate recurring discount from subscription items
            if (subscription.items.data.length > 0) {
              const baseItem = subscription.items.data[0]
              const baseAmount = baseItem.price.unit_amount || 0

              if (coupon.percent_off) {
                recurringDiscount = Math.round(baseAmount * (coupon.percent_off / 100))
              } else if (coupon.amount_off) {
                recurringDiscount = coupon.amount_off
              }
            }
          }
        } catch (error) {
          debugLog('Failed to retrieve subscription for discount info:', error)
        }
      }

      // Debug logging for final values
      console.log('[Webhook] DEBUG: Final discount values being saved:', {
        couponId: couponId,
        discountMetadataCouponId: discountMetadata.coupon_id,
        discountAmount: discountAmount,
        finalDiscountCode: couponId || discountMetadata.coupon_id || null,
        finalDiscountAmount: discountAmount || null
      })

      // Update submission with payment details including discount information
      // Only update Stripe IDs if not already set (don't overwrite values from CheckoutSessionService)
      const updateData: any = {
        status: 'paid',
        payment_amount: invoice.total,
        currency: invoice.currency.toUpperCase(),
        discount_code: couponId || discountMetadata.coupon_id || null,
        discount_amount: discountAmount || null,
        payment_completed_at: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString(),
        payment_metadata: {
          invoice_id: invoice.id,
          payment_method: invoice.default_payment_method,
          billing_reason: invoice.billing_reason,
          schedule_id: scheduleId,
          subtotal: invoice.subtotal,
          discount_amount: discountAmount,
          recurring_discount: recurringDiscount,
          discount_info: discountMetadata
        },
        updated_at: new Date().toISOString()
      }

      // Only update Stripe IDs if webhook has values (don't overwrite with NULL)
      // This prevents race condition where webhook overwrites CheckoutSessionService's values
      if (paymentIntentId) updateData.stripe_payment_id = paymentIntentId
      if (customerId) updateData.stripe_customer_id = customerId
      if (subscriptionId) updateData.stripe_subscription_id = subscriptionId
      if (scheduleId) updateData.stripe_subscription_schedule_id = scheduleId

      const { error: updateError } = await supabase
        .from('onboarding_submissions')
        .update(updateData)
        .eq('id', submission.id)

      if (updateError) {
        console.error('[Webhook] Failed to update submission in invoice.paid:', updateError)
        throw new Error(`Failed to update submission: ${updateError.message}`)
      }

      // Log payment event
      const { error: analyticsError } = await supabase.from('onboarding_analytics').insert({
        session_id: submission.session_id,
        event_type: 'payment_succeeded',
        metadata: {
          submission_id: submission.id,
          stripe_payment_id: paymentIntentId,
          amount: invoice.amount_paid,
          currency: invoice.currency
        }
      })

      if (analyticsError) {
        if (analyticsError.code === '23503') {
          console.warn('[Webhook] Skipping analytics log because session no longer exists (cleanup already ran).', {
            submissionId: submission.id,
            sessionId: submission.session_id
          })
        } else {
          console.error('[Webhook] Failed to log payment analytics event:', analyticsError)
        }
        // Don't throw - analytics is non-critical, continue processing
      }

      // Send admin notification email
      // Note: EmailService.sendPaymentNotification already checks IS_TEST_MODE
      // which includes CI, development, and Vercel preview environments
      if (ADMIN_EMAIL) {
        const businessName = submission.form_data?.businessName ||
                           submission.form_data?.step3?.businessName ||
                           'Unknown Business'
        const email = submission.form_data?.email ||
                     submission.form_data?.businessEmail ||
                     submission.form_data?.step3?.businessEmail ||
                     'unknown@example.com'
        const additionalLanguages = submission.form_data?.step13?.additionalLanguages || []

        try {
          await EmailService.sendPaymentNotification(
            submission.id,
            businessName,
            email,
            invoice.amount_paid,
            invoice.currency.toUpperCase(),
            paymentIntentId ?? '',
            additionalLanguages
          )
          debugLog('Payment notification sent successfully')
        } catch (emailError) {
          console.error('Failed to send payment notification email:', emailError)
          // Log error but don't fail the webhook
        }

        // Send customer success confirmation email
        try {
          // Determine locale from submission metadata or default to 'en'
          const locale = (submission.metadata?.locale as 'en' | 'it') || 'en'

          await EmailService.sendPaymentSuccessConfirmation(
            email,
            businessName,
            invoice.amount_paid,
            invoice.currency.toUpperCase(),
            locale
          )
          debugLog('Customer success confirmation sent successfully')
        } catch (emailError) {
          console.error('Failed to send customer success confirmation email:', emailError)
          // Log error but don't fail the webhook
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error handling invoice.paid:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle payment_intent.succeeded event - For immediate payments
   */
  async handlePaymentIntentSucceeded(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      debugLog('[Webhook] 💳 Processing payment_intent.succeeded')
      const paymentIntent = event.data.object as any
      const customerId = paymentIntent.customer as string
      const paymentIntentId = paymentIntent.id
      const amount = paymentIntent.amount
      const currency = paymentIntent.currency
      const invoiceRef = paymentIntent.invoice
      let invoiceId: string | null = null
      let invoiceSubtotal: number | null = null
      let invoiceDiscountAmount = 0

      // Find submission by customer_id or metadata
      const lookupResult = await this.findSubmissionByEvent(event, supabase)
      if (!lookupResult.submission) {
        // fallback lookup by subscription_id or customer_id
        const { data: fallbackSubmission } = await supabase
          .from('onboarding_submissions')
          .select('*')
          .eq('stripe_subscription_id', paymentIntent?.metadata?.subscription_id || '')
          .maybeSingle()

        if (fallbackSubmission) {
          lookupResult.submission = fallbackSubmission
        }
      }

      if (!lookupResult.submission) {
        console.error(`Submission not found for payment intent ${paymentIntentId}`)
        return { success: false, error: 'Submission not found' }
      }

      const submission = lookupResult.submission

      // Extract discount information from invoice
      let discountMetadata: any = {}
      let couponId: string | null = null

      if (invoiceRef) {
        try {
          invoiceId = typeof invoiceRef === 'string' ? invoiceRef : invoiceRef.id
          if (invoiceId) {
            const invoice = await this.stripe.invoices.retrieve(invoiceId, {
              expand: ['total_discount_amounts']
            })
            invoiceSubtotal = typeof invoice.subtotal === 'number' ? invoice.subtotal : null
            invoiceDiscountAmount = (invoice.total_discount_amounts || []).reduce(
              (sum, discount) => sum + discount.amount,
              0
            )

            // Try to get coupon ID from invoice discounts
            const invoiceAny = invoice as any
            if (invoiceAny.discounts && invoiceAny.discounts.length > 0) {
              const firstDiscount = invoiceAny.discounts[0]
              if (firstDiscount.discount) {
                // Discount object structure
                couponId = firstDiscount.discount.coupon?.id || firstDiscount.discount.coupon || null
              } else if (typeof firstDiscount === 'string') {
                // Direct coupon ID
                couponId = firstDiscount
              } else if (firstDiscount.coupon) {
                // Direct coupon object
                couponId = typeof firstDiscount.coupon === 'string' ? firstDiscount.coupon : firstDiscount.coupon.id
              }
            }
          }
        } catch (invoiceError) {
          debugLog('Failed to retrieve invoice for payment intent:', invoiceError)
        }
      }

      // Check customer for discount information if not found in invoice
      if (!couponId && customerId) {
        try {
          const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer & { discount?: Stripe.Discount | null }
          if (customer.discount) {
            couponId = customer.discount.coupon.id
            console.log('[Webhook] DEBUG: PaymentIntent - Got coupon from customer discount:', couponId)
          }
        } catch (error) {
          debugLog('Failed to retrieve customer for discount info in payment_intent:', error)
        }
      }

      // Get discount information from subscription if it exists
      let recurringDiscount = 0

      if (submission.stripe_subscription_id) {
        try {
          const subscription = await this.stripe.subscriptions.retrieve(submission.stripe_subscription_id)

          const subscriptionAny = subscription as any
          const discount = subscriptionAny.discount ?? subscriptionAny.discounts?.data?.[0] ?? null

          if (discount) {
            const coupon = (discount as any).coupon as Stripe.Coupon
            // Use invoice coupon ID if available, otherwise use subscription coupon ID
            if (!couponId) {
              couponId = coupon.id
            }
            discountMetadata = {
              coupon_id: coupon.id,
              duration: coupon.duration,
              duration_in_months: coupon.duration_in_months,
              percent_off: coupon.percent_off,
              amount_off: coupon.amount_off
            }

            // Calculate recurring discount from subscription items
            if (subscription.items.data.length > 0) {
              const baseItem = subscription.items.data[0]
              const baseAmount = baseItem.price.unit_amount || 0

              if (coupon.percent_off) {
                recurringDiscount = Math.round(baseAmount * (coupon.percent_off / 100))
              } else if (coupon.amount_off) {
                recurringDiscount = coupon.amount_off
              }
            }
          }
        } catch (error) {
          debugLog('Failed to retrieve subscription for discount info:', error)
        }
      }

      const computedDiscountAmount = invoiceDiscountAmount || recurringDiscount || 0
      const computedSubtotal = typeof invoiceSubtotal === 'number'
        ? invoiceSubtotal
        : amount + computedDiscountAmount

      // Update submission with payment details
      // Only update Stripe IDs if not already set (don't overwrite values from CheckoutSessionService)
      const updateData: any = {
        status: 'paid',
        payment_amount: amount,
        currency: currency.toUpperCase(),
        discount_code: couponId || discountMetadata.coupon_id || null,
        discount_amount: computedDiscountAmount || null,
        payment_completed_at: new Date().toISOString(),
        payment_metadata: {
          payment_intent_id: paymentIntentId,
          invoice_id: invoiceId,
          payment_method: paymentIntent.payment_method,
          amount_charged: amount,
          currency: currency.toUpperCase(),
          subtotal: computedSubtotal,
          discount_amount: computedDiscountAmount,
          recurring_discount: recurringDiscount,
          discount_info: discountMetadata
        },
        updated_at: new Date().toISOString()
      }

      // Only update Stripe IDs if webhook has values (don't overwrite with NULL)
      // This prevents race condition where webhook overwrites CheckoutSessionService's values
      if (paymentIntentId) updateData.stripe_payment_id = paymentIntentId
      if (customerId) updateData.stripe_customer_id = customerId

      const { error: updateError } = await supabase
        .from('onboarding_submissions')
        .update(updateData)
        .eq('id', submission.id)

      if (updateError) {
        console.error('[Webhook] Failed to update submission:', updateError)
        throw new Error(`Failed to update submission: ${updateError.message}`)
      }

      debugLog('[Webhook] ✅ Submission updated: status=paid')

      // Log payment event
      const { error: analyticsError } = await supabase.from('onboarding_analytics').insert({
        session_id: submission.session_id,
        event_type: 'payment_succeeded',
        metadata: {
          payment_intent_id: paymentIntentId,
          amount,
          currency
        }
      })

      if (analyticsError) {
        if (analyticsError.code === '23503') {
          console.warn('[Webhook] Skipping analytics log because session no longer exists (cleanup already ran).', {
            submissionId: submission.id,
            sessionId: submission.session_id
          })
        } else {
          console.error('[Webhook] Failed to log payment analytics event:', analyticsError)
        }
        // Don't throw - analytics is non-critical, continue processing
      }

      // Send customer success confirmation email
      if (ADMIN_EMAIL) {
        const businessName = submission.form_data?.businessName ||
                           submission.form_data?.step3?.businessName ||
                           'Unknown Business'
        const email = submission.form_data?.email ||
                     submission.form_data?.businessEmail ||
                     submission.form_data?.step3?.businessEmail ||
                     'unknown@example.com'

        try {
          // Determine locale from submission metadata or default to 'en'
          const locale = (submission.metadata?.locale as 'en' | 'it') || 'en'

          await EmailService.sendPaymentSuccessConfirmation(
            email,
            businessName,
            amount,
            currency.toUpperCase(),
            locale
          )
          debugLog('Customer success confirmation sent successfully')
        } catch (emailError) {
          console.error('Failed to send customer success confirmation email:', emailError)
          // Log error but don't fail the webhook
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error handling payment_intent.succeeded:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle customer.subscription.created event
   */
  async handleSubscriptionCreated(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      debugLog('[Webhook] 🎫 Processing customer.subscription.created')
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      const scheduleId = subscription.schedule as string | null

      debugLog('[Webhook] Subscription details:', {
        subscription_id: subscription.id,
        customer_id: customerId,
        schedule_id: scheduleId
      })

      // Find submission
      const lookupResult = await this.findSubmissionByEvent(event, supabase)
      if (!lookupResult.submission) {
        debugLog('[Webhook] ⚠️  No submission found for subscription:', subscription.id)
        return { success: true } // Not an error, just log it
      }

      const submissionData = lookupResult.submission

      debugLog('[Webhook] Found submission:', submissionData.id)
      debugLog('[Webhook] Current stripe_subscription_id:', submissionData.stripe_subscription_id)

      if (submissionData.stripe_subscription_id && submissionData.stripe_subscription_id !== subscription.id) {
        debugLog('[Webhook] ⚠️  WARNING: Submission already has different subscription_id!', {
          existing: submissionData.stripe_subscription_id,
          new: subscription.id
        })
      }

      // Update submission with subscription ID
      await supabase
        .from('onboarding_submissions')
        .update({
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          stripe_subscription_schedule_id: scheduleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionData.id)

      debugLog('[Webhook] ✓ Submission updated with subscription_id:', subscription.id)

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: submissionData.session_id || null,
        event_type: 'subscription_created',
        metadata: {
          submission_id: submissionData.id,
          subscription_id: subscription.id,
          customer_id: customerId,
          schedule_id: scheduleId
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling subscription.created:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle customer.subscription.updated event
   */
  async handleSubscriptionUpdated(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const subscription = event.data.object as Stripe.Subscription

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'subscription_updated',
        metadata: {
          subscription_id: subscription.id,
          status: subscription.status
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling subscription.updated:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle setup_intent.succeeded event
   * Triggered when payment method is successfully collected for $0 invoices
   */
  async handleSetupIntentSucceeded(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const setupIntent = event.data.object as Stripe.SetupIntent
      const isResourceMissingError = (error: unknown) =>
        Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'resource_missing')

      console.log('[Webhook] 🔧 Processing setup_intent.succeeded', {
        setupIntentId: setupIntent.id,
        customerId: setupIntent.customer,
        paymentMethod: setupIntent.payment_method,
        metadataKeys: Object.keys(setupIntent.metadata || {}),
        metadataJSON: JSON.stringify(setupIntent.metadata)
      })

      let submissionId = setupIntent.metadata?.submission_id
      let subscriptionId = setupIntent.metadata?.subscription_id

      let fallbackCustomerId: string | undefined

      if (!submissionId) {
        const { data: submissionLookup, error: submissionLookupError } = await supabase
          .from('onboarding_submissions')
          .select('id, stripe_subscription_id, session_id, stripe_customer_id')
          .eq('stripe_payment_id', setupIntent.id)
          .single()

        if (submissionLookup) {
          const enrichedSubmissionId = submissionLookup.id
          submissionId = enrichedSubmissionId
          subscriptionId = subscriptionId ?? submissionLookup.stripe_subscription_id ?? undefined
          fallbackCustomerId = submissionLookup.stripe_customer_id ?? undefined

          setupIntent.metadata = {
            ...(setupIntent.metadata || {}),
            submission_id: enrichedSubmissionId,
            session_id: submissionLookup.session_id || setupIntent.metadata?.session_id || '',
            ...(subscriptionId ? { subscription_id: subscriptionId } : {})
          }

          console.log('[Webhook] Enriched setup_intent metadata from database', {
            setupIntentId: setupIntent.id,
            submissionId,
            subscriptionId
          })
        } else {
          console.warn('[Webhook] Unable to enrich setup_intent metadata from database', {
            setupIntentId: setupIntent.id,
            lookupError: submissionLookupError
          })
        }
      }

      // When metadata already contains submission_id we still may need subscription/customer fallbacks
      if (submissionId && (!subscriptionId || !setupIntent.customer)) {
        const { data: submissionRecord, error: submissionRecordError } = await supabase
          .from('onboarding_submissions')
          .select('stripe_subscription_id, stripe_customer_id')
          .eq('id', submissionId)
          .single()

        if (submissionRecord) {
          if (!subscriptionId) {
            subscriptionId = submissionRecord.stripe_subscription_id ?? undefined
          }
          if (!setupIntent.customer) {
            fallbackCustomerId = submissionRecord.stripe_customer_id ?? undefined
          }
        } else if (submissionRecordError) {
          console.warn('[Webhook] Unable to fetch submission for setup intent fallback', {
            submissionId,
            error: submissionRecordError
          })
        }
      }

      console.log('[Webhook] Extracted metadata values:', {
        submissionId,
        subscriptionId,
        hasMetadata: !!setupIntent.metadata,
        metadataType: typeof setupIntent.metadata
      })

      if (!submissionId) {
        console.warn('[Webhook] setup_intent.succeeded without submission_id metadata')
        return { success: true }
      }

      // Verify payment method was collected
      if (!setupIntent.payment_method) {
        throw new Error('SetupIntent succeeded but no payment method attached')
      }

      debugLog('[Webhook] Payment method successfully collected for $0 invoice', {
        submissionId,
        subscriptionId,
        setupIntentId: setupIntent.id,
        paymentMethodId: setupIntent.payment_method
      })

      // Attach payment method to subscription for future billing
      if (subscriptionId) {
        try {
          await this.stripe.subscriptions.update(subscriptionId, {
            default_payment_method: setupIntent.payment_method as string
          })

          debugLog('[Webhook] Payment method attached to subscription', {
            subscriptionId,
            paymentMethodId: setupIntent.payment_method
          })
        } catch (error) {
          if (isResourceMissingError(error)) {
            console.warn('[Webhook] Subscription missing while attaching payment method, skipping', {
              subscriptionId,
              setupIntentId: setupIntent.id
            })
          } else {
            throw error
          }
        }
      }

      // Also set as customer's default payment method for future invoices
      const resolvedCustomerId = (setupIntent.customer as string | undefined) ?? fallbackCustomerId

      if (resolvedCustomerId) {
        try {
          await this.stripe.customers.update(resolvedCustomerId, {
            invoice_settings: {
              default_payment_method: setupIntent.payment_method as string
            }
          })

          debugLog('[Webhook] Payment method set as customer default', {
            customerId: resolvedCustomerId,
            paymentMethodId: setupIntent.payment_method
          })
        } catch (error) {
          if (isResourceMissingError(error)) {
            console.warn('[Webhook] Customer missing while setting default payment method, skipping', {
              customerId: resolvedCustomerId,
              setupIntentId: setupIntent.id
            })
          } else {
            throw error
          }
        }
      } else {
        console.warn('[Webhook] Unable to determine customer for setup_intent.succeeded', {
          setupIntentId: setupIntent.id,
          submissionId
        })
      }

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: setupIntent.metadata?.session_id || null,
        event_type: 'setup_intent_succeeded',
        metadata: {
          setup_intent_id: setupIntent.id,
          submission_id: submissionId,
          subscription_id: subscriptionId,
          payment_method_id: setupIntent.payment_method
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling setup_intent.succeeded:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle customer.subscription.deleted event
   */
  async handleSubscriptionDeleted(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const subscription = event.data.object as Stripe.Subscription

      // Find and update submission status
      const lookupResult = await this.findSubmissionByEvent(event, supabase)
      if (lookupResult.submission) {
        const submission = lookupResult.submission

        await supabase
          .from('onboarding_submissions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', submission.id)

        // Extract customer information for emails
        const businessName = submission.form_data?.businessName ||
                           submission.form_data?.step3?.businessName ||
                           'Unknown Business'
        const email = submission.form_data?.email ||
                     submission.form_data?.businessEmail ||
                     submission.form_data?.step3?.businessEmail ||
                     'unknown@example.com'

        // Determine locale from submission metadata or default to 'en'
        const locale = (submission.metadata?.locale as 'en' | 'it') || 'en'

        // Send customer cancellation confirmation email
        if (ADMIN_EMAIL) {
          try {
            await EmailService.sendCancellationConfirmation(
              email,
              businessName,
              locale
            )
            debugLog('Cancellation confirmation sent to customer')
          } catch (emailError) {
            console.error('Failed to send cancellation confirmation email:', emailError)
            // Log error but don't fail the webhook
          }

          // Send admin notification email
          try {
            await EmailService.sendCancellationNotification(
              submission.id,
              businessName,
              email,
              subscription.id,
              subscription.canceled_at || Math.floor(Date.now() / 1000)
            )
            debugLog('Cancellation notification sent to admin')
          } catch (emailError) {
            console.error('Failed to send cancellation notification email:', emailError)
            // Log error but don't fail the webhook
          }
        }
      }

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'subscription_deleted',
        metadata: {
          subscription_id: subscription.id,
          canceled_at: subscription.canceled_at
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling subscription.deleted:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle subscription_schedule.completed event
   */
  async handleScheduleCompleted(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const schedule = event.data.object as Stripe.SubscriptionSchedule

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'schedule_completed',
        metadata: {
          schedule_id: schedule.id,
          completed_at: schedule.completed_at
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling schedule.completed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle subscription_schedule.canceled event
   */
  async handleScheduleCanceled(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const schedule = event.data.object as Stripe.SubscriptionSchedule

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'schedule_canceled',
        metadata: {
          schedule_id: schedule.id,
          canceled_at: schedule.canceled_at
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling schedule.canceled:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle charge.refunded event
   */
  async handleChargeRefunded(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const charge = event.data.object as Stripe.Charge

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'charge_refunded',
        metadata: {
          charge_id: charge.id,
          amount_refunded: charge.amount_refunded,
          refunded: charge.refunded
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling charge.refunded:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Handle payment_intent.payment_failed event
   */
  async handlePaymentFailed(
    event: Stripe.Event,
    supabase: SupabaseClient
  ): Promise<WebhookHandlerResult> {
    try {
      const paymentIntent = event.data.object as Stripe.PaymentIntent

      // Log analytics event
      await supabase.from('onboarding_analytics').insert({
        session_id: null,
        event_type: 'payment_failed',
        metadata: {
          payment_intent_id: paymentIntent.id,
          error_code: paymentIntent.last_payment_error?.code,
          error_message: paymentIntent.last_payment_error?.message
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Error handling payment_intent.payment_failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
