/**
 * Payment Service Type Definitions
 * Shared types for payment-related services
 */

import Stripe from 'stripe'

// =============================================================================
// CHECKOUT SESSION TYPES
// =============================================================================

export interface CreateSessionParams {
  submissionId: string
  additionalLanguages?: string[]
  discountCode?: string
  successUrl?: string
  cancelUrl?: string
}

export interface SubmissionValidationResult {
  valid: boolean
  submission?: any
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
  submission: any | null
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
