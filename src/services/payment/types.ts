/**
 * Payment Service Type Definitions
 * Shared types for payment-related services
 */

import Stripe from 'stripe'

// =============================================================================
// CHECKOUT SESSION TYPES
// =============================================================================

export interface OnboardingSubmissionRecord {
  id: string
  session_id: string | null
  status: string
  email?: string | null
  business_name?: string | null
  form_data?: Record<string, any> | null
  metadata?: Record<string, any> | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  stripe_subscription_schedule_id?: string | null
  stripe_payment_id?: string | null
  stripe_invoice_id?: string | null
  payment_amount?: number | null
  payment_completed_at?: string | null
  payment_metadata?: Record<string, any> | null
}

export interface CreateSessionParams {
  submissionId: string
  additionalLanguages?: string[]
  discountCode?: string
  successUrl?: string
  cancelUrl?: string
}

export interface SubmissionValidationResult {
  valid: boolean
  submission?: OnboardingSubmissionRecord
  existingSubscription?: boolean
  error?: {
    code: string
    message: string
    status: number
  }
}

export interface CustomerInfo {
  email: string
  businessName: string
}

export interface CheckoutSessionResult {
  success: boolean
  paymentRequired: boolean
  clientSecret: string | null
  invoiceId?: string | null
  customerId?: string
  subscriptionId?: string
  subscriptionScheduleId?: string
  paymentIntentId?: string | null
  pricingSummary?: PricingSummary
  taxAmount?: number
  taxCurrency?: string
  invoiceTotal?: number
  invoiceDiscount?: number
  couponId?: string | null
  error?: {
    code: string
    message: string
  }
}

export interface PricingLineItem {
  id: string
  description: string
  amount: number
  originalAmount: number
  quantity: number
  discountAmount: number
  isRecurring: boolean
}

export interface PricingSummary {
  subtotal: number
  total: number
  discountAmount: number
  recurringAmount: number
  recurringDiscount: number
  taxAmount: number
  currency: string
  lineItems: PricingLineItem[]
  /** Discount duration: 'once' (first payment only), 'forever' (all payments), 'repeating' (N months) */
  discountDuration?: 'once' | 'forever' | 'repeating' | null
  /** For 'repeating' discounts, the number of months the discount applies */
  discountDurationMonths?: number | null
  /** The full recurring amount without any discount (useful for 'once' duration display) */
  recurringAmountFull?: number
}

// =============================================================================
// STRIPE SERVICE TYPES
// =============================================================================

export interface SubscriptionScheduleParams {
  customerId: string
  priceId: string
  couponId?: string
  metadata?: Record<string, string>
}

export interface SubscriptionScheduleResult {
  schedule: Stripe.SubscriptionSchedule
  subscription?: Stripe.Subscription
}

// =============================================================================
// WEBHOOK SERVICE TYPES
// =============================================================================

export interface SubmissionLookupResult {
  submission: OnboardingSubmissionRecord | null
  foundBy?: 'schedule_id' | 'customer_id' | 'metadata' | 'subscription_id'
}

export interface WebhookHandlerResult {
  success: boolean
  error?: string
}

// =============================================================================
// RATE LIMITING TYPES
// =============================================================================

export interface RateLimitResult {
  allowed: boolean
  attemptsRemaining?: number
  resetAt?: Date
}
