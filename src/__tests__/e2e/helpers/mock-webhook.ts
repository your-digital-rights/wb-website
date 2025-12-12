import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Send a mock Stripe webhook event to the webhook endpoint
 * This is used in CI environments where we can't use stripe listen
 *
 * @param event - The Stripe event to send
 * @param baseUrl - The base URL of the deployment (optional, defaults to process.env.BASE_URL)
 */
export async function sendMockWebhook(
  event: Stripe.Event,
  baseUrl?: string
): Promise<Response> {
  const url = baseUrl || process.env.BASE_URL || 'http://localhost:3783'
  const webhookUrl = `${url}/api/stripe/webhook`

  // Add Vercel bypass header if available
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-mock-webhook': 'true',
  }

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Mock webhook failed: ${response.status} ${response.statusText}\n${errorText}`
    )
  }

  return response
}

/**
 * Trigger mock webhook for a payment after it completes
 * Fetches the submission data and sends appropriate mock webhook events
 *
 * @param submissionId - The submission ID to trigger webhooks for
 * @param expectedAmount - Optional expected payment amount (for validation testing)
 */
export async function triggerMockWebhookForPayment(submissionId: string, expectedAmount?: number): Promise<void> {
  // Only use mock webhooks when BASE_URL is set (CI environment)
  if (!process.env.BASE_URL) {
    // Local environment - real webhooks will arrive via stripe listen
    return
  }

  console.log(`📤 Triggering mock webhook for submission: ${submissionId}`)

  // Wait for database write to propagate (race condition fix)
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Fetch submission to get Stripe IDs
  const { data: submission, error } = await supabase
    .from('onboarding_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (error || !submission) {
    throw new Error(`Failed to fetch submission: ${error?.message}`)
  }

  const rawIntentId = submission.stripe_payment_id as string | null
  const isSetupIntent = !!rawIntentId && rawIntentId.startsWith('seti_')
  let paymentIntentId = !isSetupIntent ? rawIntentId : null
  const setupIntentId = isSetupIntent ? rawIntentId : null
  const customerId = submission.stripe_customer_id
  let subscriptionId = submission.stripe_subscription_id
  let invoiceId: string | null = null

  // Determine payment amount:
  // 1. Use expectedAmount if provided by test (explicit validation)
  // 2. Otherwise fetch from Stripe API (payment_amount is NULL until webhook processes)
  const hasExplicitAmount = expectedAmount !== undefined
  let paymentAmount = hasExplicitAmount ? expectedAmount! : 0
  let stripeClient: Stripe | null = null

  const getStripeClient = () => {
    if (!stripeClient) {
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-09-30.clover'
      })
    }
    return stripeClient
  }

  const hydrateFromPaymentIntent = async () => {
    if (!paymentIntentId) {
      return
    }

    try {
      const stripe = getStripeClient()
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['invoice']
      })

      if (!hasExplicitAmount) {
        paymentAmount = paymentIntent.amount
      }

      // Prefer metadata first to keep tests deterministic
      if (!subscriptionId && paymentIntent.metadata?.subscription_id) {
        subscriptionId = paymentIntent.metadata.subscription_id
      }

      const invoiceFromIntent = paymentIntent.invoice
      if (invoiceFromIntent) {
        if (typeof invoiceFromIntent === 'string') {
          invoiceId = invoiceId || invoiceFromIntent
          try {
            const invoice = await stripe.invoices.retrieve(invoiceFromIntent)
            const invoiceSubscriptionRaw = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription ?? null
            if (!subscriptionId && invoiceSubscriptionRaw) {
              subscriptionId = typeof invoiceSubscriptionRaw === 'string'
                ? invoiceSubscriptionRaw
                : invoiceSubscriptionRaw.id
            }
            if (!hasExplicitAmount && typeof invoice.total === 'number') {
              paymentAmount = invoice.total
            }
          } catch (invoiceError) {
            console.error(`Failed to retrieve invoice ${invoiceFromIntent} for mock webhook:`, invoiceError)
          }
        } else {
          invoiceId = invoiceId || invoiceFromIntent.id
          const invoiceSubscriptionRaw = (invoiceFromIntent as any).subscription ?? null
          if (!subscriptionId && invoiceSubscriptionRaw) {
            subscriptionId = typeof invoiceSubscriptionRaw === 'string'
              ? invoiceSubscriptionRaw
              : invoiceSubscriptionRaw.id
          }
          if (!hasExplicitAmount && typeof invoiceFromIntent.total === 'number') {
            paymentAmount = invoiceFromIntent.total
          }
        }
      }

      // Last resort: derive subscription from customer if still missing
      if (!subscriptionId && typeof paymentIntent.customer === 'string') {
        const customerSubs = await stripe.subscriptions.list({
          customer: paymentIntent.customer,
          limit: 1
        })
        if (customerSubs.data.length > 0) {
          subscriptionId = customerSubs.data[0].id
          if (!invoiceId) {
            const latestInvoice = customerSubs.data[0].latest_invoice
            if (typeof latestInvoice === 'string') {
              invoiceId = latestInvoice
            } else if (latestInvoice?.id) {
              invoiceId = latestInvoice.id
            }
          }
        }
      }

      console.log(`📊 Hydrated payment_intent ${paymentIntentId}`, {
        subscriptionId,
        invoiceId,
        paymentAmount
      })
    } catch (error) {
      console.error(`Failed to retrieve payment intent ${paymentIntentId}:`, error)
      if (!hasExplicitAmount) {
        paymentAmount = submission.payment_amount || 0
      }
    }
  }

  if (paymentIntentId) {
    await hydrateFromPaymentIntent()
  }

  // Derive missing Stripe IDs from customer/subscription if needed
  if (!subscriptionId && customerId) {
    try {
      const stripe = getStripeClient()
      const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1 })
      if (subs.data.length > 0) {
        subscriptionId = subs.data[0].id
        if (!invoiceId) {
          const latestInvoice = subs.data[0].latest_invoice
          if (typeof latestInvoice === 'string') {
            invoiceId = latestInvoice
          } else if (latestInvoice?.id) {
            invoiceId = latestInvoice.id
          }
        }
        if (!paymentIntentId && subs.data[0].latest_invoice) {
          const latestInvoice = subs.data[0].latest_invoice
          if (typeof latestInvoice === 'string') {
            const invoice = await stripe.invoices.retrieve(latestInvoice)
            const invoicePaymentIntentRaw = (invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent ?? null
            paymentIntentId = typeof invoicePaymentIntentRaw === 'string'
              ? invoicePaymentIntentRaw
              : invoicePaymentIntentRaw?.id || null
            if (!hasExplicitAmount && typeof invoice.total === 'number') {
              paymentAmount = invoice.total
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to derive subscription for customer ${customerId}:`, error)
    }
  }

  // If we still don't have an invoice ID but have a subscription, fetch the latest invoice
  if (subscriptionId && !invoiceId) {
    try {
      const stripe = getStripeClient()
      const invoices = await stripe.invoices.list({
        subscription: subscriptionId,
        limit: 1
      })

      if (invoices.data.length > 0) {
        invoiceId = invoices.data[0].id
        if (!paymentIntentId) {
          const invoicePaymentIntentRaw = (invoices.data[0] as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent ?? null
          paymentIntentId = typeof invoicePaymentIntentRaw === 'string'
            ? invoicePaymentIntentRaw
            : invoicePaymentIntentRaw?.id || null
        }
        if (!hasExplicitAmount && typeof invoices.data[0].total === 'number') {
          paymentAmount = invoices.data[0].total ?? paymentAmount
        }
      } else {
        console.warn(`⚠️  No invoice found for subscription ${subscriptionId}, using mock ID`)
      }
    } catch (error) {
      console.error(`Failed to fetch invoice for subscription ${subscriptionId}:`, error)
    }
  }

  if (!hasExplicitAmount && paymentAmount === 0) {
    paymentAmount = submission.payment_amount || 0
  }

  // For 100% discount payments, there's no PaymentIntent (no payment to process)
  // In this case, we only send invoice.paid webhook
  if (paymentIntentId) {
    // Send payment_intent.succeeded event
    const paymentIntentEvent = createMockPaymentIntentSucceededEvent(
      paymentIntentId,
      paymentAmount,
      customerId || '',
      {
        submission_id: submissionId,
        session_id: submission.session_id || '',
        subscription_id: subscriptionId || ''
      }
    )

    await sendMockWebhook(paymentIntentEvent)
    console.log(`✅ Sent mock payment_intent.succeeded webhook`)
  } else if (setupIntentId) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-09-30.clover'
      })
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
      const setupEvent = createMockSetupIntentSucceededEvent(setupIntent, {
        submission_id: submissionId,
        session_id: submission.session_id || '',
        subscription_id: subscriptionId || ''
      })

      await sendMockWebhook(setupEvent)
      console.log(`✅ Sent mock setup_intent.succeeded webhook`)
    } catch (error) {
      console.error(`Failed to send mock setup_intent webhook for ${setupIntentId}:`, error)
    }
  } else {
    console.log(`ℹ️  No payment intent or setup intent ID on submission - skipping intent webhooks`)
  }

  // If there's a subscription, also send invoice.paid event
  if (subscriptionId) {
    // Wait a bit to simulate event timing
    await new Promise(resolve => setTimeout(resolve, 500))

    // Fetch the real invoice ID from Stripe instead of using a mock ID
    // This ensures validation tests can retrieve the invoice later
    let resolvedInvoiceId = invoiceId || `in_mock_${Date.now()}`
    if (!invoiceId) {
      try {
        const stripe = getStripeClient()

        // Get the latest invoice for this subscription
        const invoices = await stripe.invoices.list({
          subscription: subscriptionId,
          limit: 1
        })

        if (invoices.data.length > 0) {
          resolvedInvoiceId = invoices.data[0].id
          console.log(`📊 Using real Stripe invoice ID: ${resolvedInvoiceId}`)
          if (!hasExplicitAmount && typeof invoices.data[0].total === 'number') {
            paymentAmount = invoices.data[0].total ?? paymentAmount
          }
          if (!paymentIntentId) {
            const invoicePaymentIntentRaw = (invoices.data[0] as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent ?? null
            paymentIntentId = typeof invoicePaymentIntentRaw === 'string'
              ? invoicePaymentIntentRaw
              : invoicePaymentIntentRaw?.id || paymentIntentId
          }
        } else {
          console.warn(`⚠️  No invoice found for subscription ${subscriptionId}, using mock ID`)
        }
      } catch (error) {
        console.error(`Failed to fetch invoice for subscription ${subscriptionId}:`, error)
        console.log(`Using mock invoice ID as fallback`)
      }
    }

    const invoiceEvent = createMockInvoicePaidEvent(
      resolvedInvoiceId,
      subscriptionId,
      customerId || '',
      paymentAmount,
      {
        submission_id: submissionId,
        session_id: submission.session_id || '',
      }
    )

    await sendMockWebhook(invoiceEvent)
    console.log(`✅ Sent mock invoice.paid webhook`)
  }
}

/**
 * Create a mock payment_intent.succeeded event
 */
export function createMockPaymentIntentSucceededEvent(
  paymentIntentId: string,
  amount: number,
  customerId: string,
  metadata: Record<string, string> = {}
): Stripe.Event {
  return {
    id: `evt_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    object: 'event',
    api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000),
    type: 'payment_intent.succeeded',
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount,
        currency: 'eur',
        customer: customerId,
        metadata,
        status: 'succeeded',
        // Add other required PaymentIntent fields with mock data
      } as Stripe.PaymentIntent,
    },
  } as Stripe.Event
}

export function createMockSetupIntentSucceededEvent(
  setupIntent: Stripe.SetupIntent,
  metadata: Record<string, string> = {}
): Stripe.Event {
  const serializedSetupIntent = JSON.parse(JSON.stringify(setupIntent)) as Stripe.SetupIntent

  serializedSetupIntent.metadata = {
    ...(serializedSetupIntent.metadata || {}),
    ...metadata
  }

  serializedSetupIntent.status = 'succeeded'

  return {
    id: `evt_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    object: 'event',
    api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000),
    type: 'setup_intent.succeeded',
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    data: {
      object: serializedSetupIntent,
    },
  } as Stripe.Event
}

/**
 * Create a mock invoice.paid event
 */
export function createMockInvoicePaidEvent(
  invoiceId: string,
  subscriptionId: string,
  customerId: string,
  amount: number,
  metadata: Record<string, string> = {}
): Stripe.Event {
  return {
    id: `evt_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    object: 'event',
    api_version: '2025-09-30.clover',
    created: Math.floor(Date.now() / 1000),
    type: 'invoice.paid',
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    data: {
      object: {
        id: invoiceId,
        object: 'invoice',
        amount_due: amount,
        amount_paid: amount,
        total: amount,
        subtotal: amount,
        currency: 'eur',
        customer: customerId,
        subscription: subscriptionId,
        metadata,
        status: 'paid',
        status_transitions: {
          paid_at: Math.floor(Date.now() / 1000)
        },
        // Add other required Invoice fields with mock data
      } as Stripe.Invoice,
    },
  } as Stripe.Event
}
