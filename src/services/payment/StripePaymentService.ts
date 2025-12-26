/**
 * Stripe Payment Service
 * Centralized service for all Stripe SDK interactions
 */

import Stripe from 'stripe'
import { SubscriptionScheduleParams, SubscriptionScheduleResult } from './types'

const BASE_PACKAGE_PRICE_ID = process.env.STRIPE_BASE_PACKAGE_PRICE_ID!

export interface ValidatedDiscount {
  coupon: Stripe.Coupon
  promotionCode?: Stripe.PromotionCode
}

export class StripePaymentService {
  private stripe: Stripe

  /**
   * Initialize the service with a Stripe instance
   * Allows for dependency injection and testing
   */
  constructor(stripeInstance?: Stripe) {
    if (stripeInstance) {
      this.stripe = stripeInstance
    } else {
      // Use default Stripe instance from lib/stripe
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY!
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2025-09-30.clover'
      })
    }
  }

  /**
   * Find existing customer by email or create a new one
   *
   * @param email - Customer email address
   * @param name - Customer name (business name)
   * @param metadata - Additional metadata to store
   * @returns Stripe Customer object
   */
  async findOrCreateCustomer(
    email: string,
    name: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Customer> {
    // Try to find existing customer by email
    const customers = await this.stripe.customers.list({
      email,
      limit: 1
    })

    if (customers.data.length > 0) {
      const existingCustomer = customers.data[0]
      if (Object.keys(metadata).length > 0) {
        await this.stripe.customers.update(existingCustomer.id, {
          metadata: {
            ...existingCustomer.metadata,
            ...metadata,
            signup_source: 'web_onboarding'
          }
        })
      }
      return existingCustomer
    }

    // Create new customer if not found
    return await this.stripe.customers.create({
      email,
      name,
      metadata: {
        ...metadata,
        signup_source: 'web_onboarding'
      }
    })
  }

  /**
   * Retrieve product prices from Stripe
   * Fetches base package and language add-on prices dynamically
   *
   * @returns Object containing base package and language add-on pricing information
   */
  async getPrices(): Promise<{
    basePackage: {
      priceId: string
      amount: number
      currency: string
      interval: string
    }
    languageAddOn: {
      priceId: string
      amount: number
      currency: string
    }
  }> {
    const basePackagePriceId = process.env.STRIPE_BASE_PACKAGE_PRICE_ID
    const languageAddonPriceId = process.env.STRIPE_LANGUAGE_ADDON_PRICE_ID

    if (!basePackagePriceId || !languageAddonPriceId) {
      throw new Error('STRIPE_BASE_PACKAGE_PRICE_ID and STRIPE_LANGUAGE_ADDON_PRICE_ID must be configured')
    }

    const [basePrice, addonPrice] = await Promise.all([
      this.stripe.prices.retrieve(basePackagePriceId),
      this.stripe.prices.retrieve(languageAddonPriceId)
    ])

    return {
      basePackage: {
        priceId: basePrice.id,
        amount: basePrice.unit_amount || 0,
        currency: basePrice.currency,
        interval: basePrice.recurring?.interval || 'month'
      },
      languageAddOn: {
        priceId: addonPrice.id,
        amount: addonPrice.unit_amount || 0,
        currency: addonPrice.currency
      }
    }
  }

  /**
   * Validate a discount coupon code or promotion code and return detailed metadata
   *
   * @param discountCode - Coupon ID or Promotion Code to validate
   * @returns Validated coupon with optional promotion code metadata, or null if invalid
   * @throws Error if validation fails
   */
  async validateDiscountCode(discountCode: string): Promise<ValidatedDiscount | null> {
    try {
      const code = discountCode.trim()

      // First, try as a promotion code (customer-facing codes like "SUMMER10")
      const promotionCodes = await this.stripe.promotionCodes.list({
        code,
        active: true,
        limit: 1
      })

      if (promotionCodes.data.length > 0) {
        const promotionCode = promotionCodes.data[0] as Stripe.PromotionCode & {
          coupon?: string | Stripe.Coupon
          promotion?: { coupon?: string | Stripe.Coupon }
        }

        // Extract coupon ID from promotion code
        // The structure is: promotionCode.promotion.coupon (string ID)
        // OR for older API versions: promotionCode.coupon (string ID or expanded object)
        let couponId: string | undefined;

        if (promotionCode.promotion?.coupon) {
          // New structure: promotion.coupon is a string ID
          couponId = typeof promotionCode.promotion.coupon === 'string'
            ? promotionCode.promotion.coupon
            : promotionCode.promotion.coupon?.id;
        } else if (promotionCode.coupon) {
          // Old structure: coupon can be string ID or expanded object
          couponId = typeof promotionCode.coupon === 'string'
            ? promotionCode.coupon
            : promotionCode.coupon?.id;
        }

        if (!couponId) {
          return null
        }

        // Retrieve the full coupon object
        const coupon = await this.stripe.coupons.retrieve(couponId)

        if (!coupon.valid) {
          return null
        }

        return {
          coupon,
          promotionCode
        }
      }

      // Fallback: try as a direct coupon ID (for backwards compatibility)
      const coupon = await this.stripe.coupons.retrieve(code)

      if (!coupon.valid) {
        return null
      }

      return {
        coupon,
        promotionCode: undefined
      }
    } catch (error) {
      // Coupon doesn't exist
      if (error instanceof Stripe.errors.StripeError) {
        if (error.code === 'resource_missing') {
          return null
        }
      }
      throw error
    }
  }

  /**
   * Validate a discount coupon code or promotion code
   *
   * @param discountCode - Coupon ID or Promotion Code to validate
   * @returns Validated coupon or null if invalid
   * @throws Error if validation fails
   */
  async validateCoupon(discountCode: string): Promise<Stripe.Coupon | null> {
    const result = await this.validateDiscountCode(discountCode)
    return result?.coupon ?? null
  }

  /**
   * Preview an invoice with subscription and invoice items
   * Returns the exact amounts Stripe will charge including discounts
   *
   * @param customerId - Stripe customer ID (null to create temporary)
   * @param priceId - Subscription price ID
   * @param couponId - Optional coupon ID
   * @param languageAddOns - Number of language add-ons
   * @returns Preview invoice with all calculations from Stripe
   */
  async previewInvoiceWithDiscount(
    customerId: string | null,
    priceId: string,
    couponId: string | null,
    languageAddOns: number
  ): Promise<{
    subtotal: number           // Before discount (cents)
    discountAmount: number     // Total discount applied (cents)
    total: number              // After discount (cents)
    subscriptionAmount: number // Recurring amount (cents)
    subscriptionDiscount: number // Discount on recurring (cents)
    lineItems: Array<{
      id: string
      description: string
      amount: number           // Final amount in cents
      originalAmount: number   // Before discount in cents
      quantity: number
      discountAmount: number   // Discount on this line in cents
      isRecurring: boolean
    }>
  }> {
    // Create a temporary customer if needed
    let customer = customerId
    let tempCustomer: Stripe.Customer | null = null

    if (!customer) {
      tempCustomer = await this.stripe.customers.create({
        email: 'preview@whiteboar.com',
        metadata: { temporary: 'true' }
      })
      customer = tempCustomer.id
    }

    // Get language add-on price from Stripe
    const languageAddonPriceId = process.env.STRIPE_LANGUAGE_ADDON_PRICE_ID!
    const addonPrice = await this.stripe.prices.retrieve(languageAddonPriceId)

    // Add invoice items (language add-ons) to customer
    const createdItems: Stripe.InvoiceItem[] = []

    try {
      for (let i = 0; i < languageAddOns; i++) {
        const item = await this.stripe.invoiceItems.create({
          customer,
          pricing: {
            price: addonPrice.id
          },
          description: 'Language Add-on Preview'
        })
        createdItems.push(item)
      }

      // Preview the upcoming invoice with subscription
      const preview = await this.stripe.invoices.createPreview({
        customer,
        schedule: undefined,
        subscription_details: {
          items: [{
            price: priceId,
            quantity: 1
          }]
        },
        ...(couponId && { discounts: [{ coupon: couponId }] })
      })

      // Get subscription recurring amount with discount from Stripe's line items
      // Stripe calculates everything - we just extract the values
      let subscriptionAmount = 0
      let subscriptionDiscount = 0

      // Find the subscription line item (not language add-ons)
      const subscriptionLine = preview.lines?.data?.find((line: any) =>
        line.price?.id === priceId ||
        line.description?.includes('WhiteBoar Base Package') ||
        line.description?.includes('Base Package')
      )

      if (subscriptionLine) {
        // Extract discount amount from discount_amounts array
        // Stripe returns line.amount as the pre-discount value; discount_amounts
        // describe the reduction that should be applied.
        if (subscriptionLine.discount_amounts && subscriptionLine.discount_amounts.length > 0) {
          subscriptionDiscount = subscriptionLine.discount_amounts.reduce(
            (sum: number, discount: any) => sum + discount.amount,
            0
          )
        }

        const subscriptionAmountTotal = (subscriptionLine as any).amount_total as number | undefined
        const subscriptionFinalAmount = typeof subscriptionAmountTotal === 'number'
          ? subscriptionAmountTotal
          : subscriptionLine.amount - subscriptionDiscount

        subscriptionAmount = subscriptionFinalAmount

        // DEBUG: Log what we calculated
        console.log('[StripeService] Preview with discount:', {
          couponId,
          originalAmount: subscriptionLine.amount,
          subscriptionDiscount,
          subscriptionAmount,
          hasDiscountAmounts: !!subscriptionLine.discount_amounts?.length
        })
      } else {
        console.log('[StripeService] WARNING: Subscription line not found in preview!')
      }

      // Extract discount amount from preview
      const discountAmount = preview.total_discount_amounts?.reduce(
        (sum, discount) => sum + discount.amount,
        0
      ) || 0

      // Parse line items from preview
      const lineItems = preview.lines.data.map((line: any) => {
        const lineDiscountAmount = line.discount_amounts?.reduce(
          (sum: number, d: any) => sum + d.amount,
          0
        ) || 0

        const isRecurring = line.price?.id === priceId ||
          line.description?.includes('WhiteBoar Base Package') ||
          line.description?.includes('Base Package')

        const lineAmountTotal = (line as any).amount_total as number | undefined
        const finalAmount = typeof lineAmountTotal === 'number'
          ? lineAmountTotal
          : line.amount - lineDiscountAmount

        return {
          id: line.id,
          description: line.description || '',
          amount: finalAmount,
          originalAmount: line.price?.unit_amount || line.amount,  // Before discount
          quantity: line.quantity || 1,
          discountAmount: lineDiscountAmount,
          isRecurring
        }
      })

      return {
        subtotal: preview.subtotal,
        discountAmount,
        total: preview.total,
        subscriptionAmount,
        subscriptionDiscount,
        lineItems
      }
    } finally {
      // Clean up: delete temporary invoice items
      for (const item of createdItems) {
        try {
          await this.stripe.invoiceItems.del(item.id)
        } catch (err) {
          console.error('Failed to delete preview invoice item:', err)
        }
      }

      // Clean up temporary customer if created
      if (tempCustomer) {
        try {
          await this.stripe.customers.del(tempCustomer.id)
        } catch (err) {
          console.error('Failed to delete temporary customer:', err)
        }
      }
    }
  }

  /**
   * Create a subscription schedule with 12-month commitment
   *
   * @param params - Schedule creation parameters
   * @returns Created subscription schedule and associated subscription
   */
  async createSubscriptionSchedule(
    params: SubscriptionScheduleParams
  ): Promise<SubscriptionScheduleResult> {
    const { customerId, priceId, couponId, metadata = {} } = params

    const now = Math.floor(Date.now() / 1000)
    // Calculate 12 months from now (approximately 365 days)
    const twelveMonthsLater = now + (12 * 30 * 24 * 60 * 60)

    const scheduleParams: Stripe.SubscriptionScheduleCreateParams = {
      customer: customerId,
      start_date: 'now',
      end_behavior: 'release',
      phases: [
        {
          items: [
            {
              price: priceId,
              quantity: 1
            }
          ],
          end_date: twelveMonthsLater,
          ...(couponId && {
            discounts: [{
              coupon: couponId
            }]
          })
        }
      ],
      metadata: {
        ...metadata,
        commitment_months: '12'
      }
    }

    const schedule = await this.stripe.subscriptionSchedules.create(scheduleParams)

    // Retrieve the created subscription
    const subscriptionId = schedule.subscription as string
    const subscription = subscriptionId
      ? await this.stripe.subscriptions.retrieve(subscriptionId)
      : undefined

    return {
      schedule,
      subscription
    }
  }

  /**
   * Retrieve a subscription by ID
   *
   * @param subscriptionId - Stripe subscription ID
   * @returns Subscription object
   */
  async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId)
  }

  /**
   * Create a Stripe Checkout Session
   *
   * @param customerId - Stripe customer ID
   * @param subscriptionId - Stripe subscription ID
   * @param successUrl - URL to redirect on success
   * @param cancelUrl - URL to redirect on cancel
   * @param metadata - Additional metadata
   * @returns Checkout session with URL
   */
  async createCheckoutSession(
    customerId: string,
    subscriptionId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: Record<string, string> = {}
  ): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: BASE_PACKAGE_PRICE_ID,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          ...metadata,
          subscription_id: subscriptionId
        }
      },
      metadata
    })
  }

  /**
   * Get the Stripe instance (for advanced usage)
   */
  getStripeInstance(): Stripe {
    return this.stripe
  }
}
