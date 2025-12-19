import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { StripePaymentService } from '@/services/payment/StripePaymentService'
import Stripe from 'stripe'

// Mock Stripe
jest.mock('stripe')

describe('StripePaymentService', () => {
  let service: StripePaymentService
  let mockStripe: jest.Mocked<Stripe>

  beforeEach(() => {
    // Create mock Stripe instance
    mockStripe = {
      customers: {
        list: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      promotionCodes: {
        list: jest.fn()
      },
      coupons: {
        retrieve: jest.fn()
      },
      subscriptionSchedules: {
        create: jest.fn()
      },
      subscriptions: {
        retrieve: jest.fn()
      },
      checkout: {
        sessions: {
          create: jest.fn()
        }
      }
    } as any

    // Create service with mocked Stripe
    service = new StripePaymentService(mockStripe as any)
  })

  describe('findOrCreateCustomer', () => {
    it('should return existing customer if found by email', async () => {
      const existingCustomer = {
        id: 'cus_existing123',
        email: 'test@example.com',
        name: 'Test Customer'
      } as Stripe.Customer

      mockStripe.customers.list.mockResolvedValue({
        data: [existingCustomer]
      } as any)

      const result = await service.findOrCreateCustomer(
        'test@example.com',
        'Test Customer',
        { session_id: 'session123' }
      )

      expect(result).toEqual(existingCustomer)
      expect(mockStripe.customers.list).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1
      })
      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_existing123', {
        metadata: {
          ...(existingCustomer.metadata || {}),
          session_id: 'session123',
          signup_source: 'web_onboarding'
        }
      })
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
    })

    it('should create new customer if not found', async () => {
      const newCustomer = {
        id: 'cus_new123',
        email: 'new@example.com',
        name: 'New Customer'
      } as Stripe.Customer

      mockStripe.customers.list.mockResolvedValue({
        data: []
      } as any)

      mockStripe.customers.create.mockResolvedValue(newCustomer as any)

      const result = await service.findOrCreateCustomer(
        'new@example.com',
        'New Customer',
        { session_id: 'session123' }
      )

      expect(result).toEqual(newCustomer)
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'New Customer',
        metadata: {
          session_id: 'session123',
          signup_source: 'web_onboarding'
        }
      })
    })

    it('should handle customer creation error', async () => {
      mockStripe.customers.list.mockResolvedValue({
        data: []
      } as any)

      mockStripe.customers.create.mockRejectedValue(
        new Error('Stripe API error')
      )

      await expect(
        service.findOrCreateCustomer('test@example.com', 'Test Customer')
      ).rejects.toThrow('Stripe API error')
    })
  })

  describe('validateDiscountCode', () => {
    it('should return coupon and promotion code metadata when promotion code is valid', async () => {
      const promotionCode = {
        id: 'promo_123',
        code: 'SUMMER10',
        promotion: {
          coupon: 'coupon_123'
        }
      } as any

      const validCoupon = {
        id: 'coupon_123',
        valid: true,
        percent_off: 15
      } as Stripe.Coupon

      mockStripe.promotionCodes.list.mockResolvedValue({ data: [promotionCode] } as any)
      mockStripe.coupons.retrieve.mockResolvedValue(validCoupon as any)

      const result = await service.validateDiscountCode('SUMMER10')

      expect(result).toEqual({
        coupon: validCoupon,
        promotionCode
      })
      expect(mockStripe.promotionCodes.list).toHaveBeenCalledWith({
        code: 'SUMMER10',
        active: true,
        limit: 1
      })
      expect(mockStripe.coupons.retrieve).toHaveBeenCalledWith('coupon_123')
    })
  })

  describe('validateCoupon', () => {
    it('should return coupon if valid and active', async () => {
      const validCoupon = {
        id: 'TESTCODE',
        valid: true,
        percent_off: 20
      } as Stripe.Coupon

      // Mock promotion codes list returning empty (will fall back to direct coupon lookup)
      mockStripe.promotionCodes.list.mockResolvedValue({ data: [] } as any)
      mockStripe.coupons.retrieve.mockResolvedValue(validCoupon as any)

      const result = await service.validateCoupon('TESTCODE')

      expect(result).toEqual(validCoupon)
      expect(mockStripe.promotionCodes.list).toHaveBeenCalledWith({
        code: 'TESTCODE',
        active: true,
        limit: 1
      })
      expect(mockStripe.coupons.retrieve).toHaveBeenCalledWith('TESTCODE')
    })

    it('should return null if coupon is invalid', async () => {
      const invalidCoupon = {
        id: 'INVALID',
        valid: false
      } as Stripe.Coupon

      // Mock promotion codes list returning empty (will fall back to direct coupon lookup)
      mockStripe.promotionCodes.list.mockResolvedValue({ data: [] } as any)
      mockStripe.coupons.retrieve.mockResolvedValue(invalidCoupon as any)

      const result = await service.validateCoupon('INVALID')

      expect(result).toBeNull()
    })

    it('should return null if coupon not found', async () => {
      const error = new Stripe.errors.StripeInvalidRequestError({
        message: 'No such coupon',
        type: 'invalid_request_error',
        code: 'resource_missing'
      } as any)

      // Mock promotion codes list returning empty (will fall back to direct coupon lookup)
      mockStripe.promotionCodes.list.mockResolvedValue({ data: [] } as any)
      mockStripe.coupons.retrieve.mockRejectedValue(error)

      const result = await service.validateCoupon('NOTFOUND')

      expect(result).toBeNull()
    })

    it('should throw error for non-resource_missing errors', async () => {
      // Mock promotion codes list returning empty (will fall back to direct coupon lookup)
      mockStripe.promotionCodes.list.mockResolvedValue({ data: [] } as any)
      mockStripe.coupons.retrieve.mockRejectedValue(
        new Error('Network error')
      )

      await expect(service.validateCoupon('ERROR')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('createSubscriptionSchedule', () => {
    it('should create subscription schedule with all parameters', async () => {
      const scheduleParams = {
        customerId: 'cus_123',
        priceId: 'price_monthly',
        couponId: 'SAVE20',
        metadata: {
          submission_id: 'sub_123',
          session_id: 'session_123'
        }
      }

      const expectedSchedule = {
        id: 'sub_sched_123',
        subscription: 'sub_456'
      } as Stripe.SubscriptionSchedule

      const expectedSubscription = {
        id: 'sub_456',
        status: 'active'
      } as Stripe.Subscription

      mockStripe.subscriptionSchedules.create.mockResolvedValue(
        expectedSchedule as any
      )

      mockStripe.subscriptions.retrieve.mockResolvedValue(
        expectedSubscription as any
      )

      const result = await service.createSubscriptionSchedule(scheduleParams)

      expect(result.schedule).toEqual(expectedSchedule)
      expect(result.subscription).toEqual(expectedSubscription)
      expect(mockStripe.subscriptionSchedules.create).toHaveBeenCalled()
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_456')
    })

    it('should create subscription schedule without coupon', async () => {
      const scheduleParams = {
        customerId: 'cus_123',
        priceId: 'price_monthly',
        metadata: {
          submission_id: 'sub_123',
          session_id: 'session_123'
        }
      }

      const expectedSchedule = {
        id: 'sub_sched_123',
        subscription: 'sub_456'
      } as Stripe.SubscriptionSchedule

      mockStripe.subscriptionSchedules.create.mockResolvedValue(
        expectedSchedule as any
      )

      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_456'
      } as any)

      await service.createSubscriptionSchedule(scheduleParams)

      const createCall = mockStripe.subscriptionSchedules.create.mock.calls[0][0]
      expect(createCall.phases[0].discounts).toBeUndefined()
    })

    it('should handle subscription schedule creation error', async () => {
      mockStripe.subscriptionSchedules.create.mockRejectedValue(
        new Error('Stripe error')
      )

      await expect(
        service.createSubscriptionSchedule({
          customerId: 'cus_123',
          priceId: 'price_monthly',
          metadata: {}
        })
      ).rejects.toThrow('Stripe error')
    })
  })

  describe('retrieveSubscription', () => {
    it('should retrieve subscription by ID', async () => {
      const subscription = {
        id: 'sub_123',
        status: 'active'
      } as Stripe.Subscription

      mockStripe.subscriptions.retrieve.mockResolvedValue(subscription as any)

      const result = await service.retrieveSubscription('sub_123')

      expect(result).toEqual(subscription)
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123')
    })

    it('should handle subscription retrieval error', async () => {
      mockStripe.subscriptions.retrieve.mockRejectedValue(
        new Error('Subscription not found')
      )

      await expect(service.retrieveSubscription('sub_invalid')).rejects.toThrow(
        'Subscription not found'
      )
    })
  })

  describe('createCheckoutSession', () => {
    it('should create checkout session with all parameters', async () => {
      const session = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session123'
      } as Stripe.Checkout.Session

      mockStripe.checkout.sessions.create.mockResolvedValue(session as any)

      const result = await service.createCheckoutSession(
        'cus_123',
        'sub_123',
        'https://example.com/success',
        'https://example.com/cancel',
        { session_id: 'session_123' }
      )

      expect(result).toEqual(session)
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        mode: 'subscription',
        customer: 'cus_123',
        line_items: [
          {
            price: process.env.STRIPE_BASE_PACKAGE_PRICE_ID,
            quantity: 1
          }
        ],
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        subscription_data: {
          metadata: {
            session_id: 'session_123',
            subscription_id: 'sub_123'
          }
        },
        metadata: { session_id: 'session_123' }
      })
    })

    it('should handle checkout session creation error', async () => {
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Payment error')
      )

      await expect(
        service.createCheckoutSession(
          'cus_123',
          'sub_123',
          'https://example.com/success',
          'https://example.com/cancel'
        )
      ).rejects.toThrow('Payment error')
    })
  })
})
