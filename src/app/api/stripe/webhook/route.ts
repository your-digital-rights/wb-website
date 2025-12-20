import { NextRequest, NextResponse, after } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { WebhookService } from '@/services/payment/WebhookService'

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Disable body parsing for webhook signature verification
// Next.js needs the raw body bytes to verify Stripe signatures
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Safe logging helper - only logs in development
function debugLog(message: string, data?: unknown) {
  if (!IS_PRODUCTION) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for payment confirmation and subscription updates
 */
export async function POST(request: NextRequest) {
  const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`
  debugLog(`[${webhookId}] === WEBHOOK RECEIVED ===`)
  debugLog(`[${webhookId}] Timestamp: ${new Date().toISOString()}`)

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // In test/CI environments, allow mock webhooks with special header
    // Mock webhooks bypass signature verification for testing
    const isMockWebhook = request.headers.get('x-mock-webhook') === 'true'
    // Check if we're using TEST Stripe keys (webhook secret starts with 'whsec_test_')
    // Production webhook secrets start with 'whsec_' (without 'test')
    const isTestEnvironment = WEBHOOK_SECRET?.startsWith('whsec_test_') ||
                               process.env.VERCEL_ENV === 'preview' ||
                               process.env.VERCEL_ENV === 'development' ||
                               process.env.CI === 'true'

    let event: Stripe.Event

    if (isMockWebhook && isTestEnvironment) {
      // Parse mock webhook directly without signature verification (test environments only)
      debugLog(`[${webhookId}] ℹ️  Processing mock webhook (test environment)`)
      event = JSON.parse(body) as Stripe.Event
    } else {
      // Real webhook - verify signature
      if (!signature) {
        debugLog(`[${webhookId}] ❌ Missing signature`)
        return NextResponse.json(
          { error: 'Missing signature' },
          { status: 400 }
        )
      }

      try {
        event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
      } catch (error) {
        console.error(`[${webhookId}] ❌ Webhook signature verification failed:`, error)
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }
    }

    // Initialize services
    const supabase = await createServiceClient()
    const webhookService = new WebhookService()

    // Mark event as processing - use unique constraint for idempotency
    const { error: insertError } = await supabase.from('stripe_webhook_events').insert({
      event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
      status: 'processing'
    })

    // If insert failed due to unique constraint (duplicate event), return early
    if (insertError && insertError.code === '23505') {
      debugLog(`[${webhookId}] ⚠️  DUPLICATE EVENT: ${event.id} already processed`)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // If insert failed for other reasons, throw error
    if (insertError) {
      debugLog(`[${webhookId}] ❌ Failed to insert event record:`, insertError)
      throw insertError
    }

    debugLog(`[${webhookId}] Event record created, scheduling background processing...`)

    // Use Next.js 15's after() API to ensure webhook processing completes
    // This keeps the serverless function alive until background work finishes
    // Critical for Vercel deployments where functions terminate after response
    after(async () => {
      try {
        await processWebhookEvent({
          event,
          supabase,
          webhookService,
          webhookId
        })
      } catch (error) {
        console.error(`[${webhookId}] ❌ Background webhook processing error:`, error)
      }
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent({
  event,
  supabase,
  webhookService,
  webhookId
}: {
  event: Stripe.Event
  supabase: Awaited<ReturnType<typeof createServiceClient>>
  webhookService: WebhookService
  webhookId: string
}) {
  try {
    let result

    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
      case 'invoice_payment.paid':
        result = await webhookService.handleInvoicePaid(event, supabase)
        break

      case 'payment_intent.succeeded':
        result = await webhookService.handlePaymentIntentSucceeded(event, supabase)
        break

      case 'setup_intent.succeeded':
        result = await webhookService.handleSetupIntentSucceeded(event, supabase)
        break

      case 'customer.subscription.created':
        result = await webhookService.handleSubscriptionCreated(event, supabase)
        break

      case 'customer.subscription.updated':
        result = await webhookService.handleSubscriptionUpdated(event, supabase)
        break

      case 'customer.subscription.deleted':
        result = await webhookService.handleSubscriptionDeleted(event, supabase)
        break

      case 'subscription_schedule.completed':
        result = await webhookService.handleScheduleCompleted(event, supabase)
        break

      case 'subscription_schedule.canceled':
        result = await webhookService.handleScheduleCanceled(event, supabase)
        break

      case 'charge.refunded':
        result = await webhookService.handleChargeRefunded(event, supabase)
        break

      case 'payment_intent.payment_failed':
        result = await webhookService.handlePaymentFailed(event, supabase)
        break

      default:
        debugLog(`[${webhookId}] ⚠️  Unhandled event type: ${event.type}`)
        result = { success: true }
    }

    if (result && !result.success) {
      throw new Error(result.error || 'Handler failed')
    }

    await supabase
      .from('stripe_webhook_events')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('event_id', event.id)

    debugLog(`[${webhookId}] ✓ Event processed successfully`)
  } catch (error) {
    console.error(`Error processing event ${event.id}:`, error)

    await supabase
      .from('stripe_webhook_events')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('event_id', event.id)

    throw error
  }
}
