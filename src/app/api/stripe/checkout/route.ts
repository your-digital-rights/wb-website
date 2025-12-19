import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCSRFToken } from '@/lib/csrf'
import { CheckoutSessionService } from '@/services/payment/CheckoutSessionService'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isValidUuid = (value: string) => UUID_REGEX.test(value)

/**
 * POST /api/stripe/checkout
 * Creates a Stripe subscription schedule, invoice, and intent for Step 14 checkout.
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[api/stripe/checkout] invalid JSON payload', parseError)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON.'
          }
        },
        { status: 400 }
      )
    }

    const {
      submissionId,
      sessionId,
      additionalLanguages = [],
      discountCode
    } = body

    const submission_id = submissionId ?? body.submission_id
    const session_id = sessionId ?? body.session_id

    console.log('[api/stripe/checkout] incoming request', {
      submission_id,
      session_id,
      discountCode,
      additionalLanguagesCount: Array.isArray(additionalLanguages) ? additionalLanguages.length : 0
    })

    if (!submission_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SUBMISSION_ID',
            message: 'Submission ID is required'
          }
        },
        { status: 400 }
      )
    }

    if (typeof submission_id !== 'string' || !isValidUuid(submission_id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SUBMISSION_ID',
            message: 'Submission ID must be a valid UUID'
          }
        },
        { status: 400 }
      )
    }

    if (session_id && (typeof session_id !== 'string' || !isValidUuid(session_id))) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SESSION_ID',
            message: 'Session ID must be a valid UUID'
          }
        },
        { status: 400 }
      )
    }

    const csrfKey = session_id || submission_id

    const csrfValidation = requireCSRFToken(request, csrfKey)
    if (!csrfValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CSRF_VALIDATION_FAILED',
            message: csrfValidation.error
          }
        },
        { status: 403 }
      )
    }

    const supabase = await createServiceClient()
    const checkoutService = new CheckoutSessionService()

    const result = await checkoutService.createCheckoutSession(
      {
        submissionId: submission_id,
        additionalLanguages,
        discountCode
      },
      supabase
    )

    if (!result.success) {
      console.error('[api/stripe/checkout] failed', {
        submission_id,
        discountCode,
        error: result.error
      })

      const statusCode = result.error?.code === 'RATE_LIMIT_EXCEEDED' ? 429 :
                        result.error?.code === 'PAYMENT_ALREADY_COMPLETED' ? 409 :
                        result.error?.code === 'MISSING_CUSTOMER_EMAIL' ? 400 :
                        result.error?.code === 'INVALID_LANGUAGE_CODE' ? 400 :
                        result.error?.code === 'INVALID_DISCOUNT_CODE' ? 400 :
                        500

      return NextResponse.json(
        {
          success: false,
          error: result.error
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentRequired: result.paymentRequired,
        clientSecret: result.clientSecret,
        submissionId: submission_id,
        stripeIds: {
          customerId: result.customerId,
          subscriptionId: result.subscriptionId,
          subscriptionScheduleId: result.subscriptionScheduleId,
          paymentId: result.paymentIntentId,
          invoiceId: result.invoiceId
        },
        summary: result.pricingSummary,
        tax: result.taxAmount !== undefined ? {
          amount: result.taxAmount,
          currency: result.taxCurrency
        } : null
      }
    })
  } catch (error) {
    console.error('Checkout controller error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create checkout session. Please try again.'
        }
      },
      { status: 500 }
    )
  }
}
