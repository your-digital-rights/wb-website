# Stripe Production Setup Guide

This guide explains how to configure Stripe for production deployment on Vercel.

## Prerequisites

- Stripe account with production mode enabled
- Vercel project deployed
- Access to Stripe Dashboard
- Access to Vercel Dashboard

## Step 1: Get Stripe Production API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. **Switch to Production Mode** (toggle in top-right corner - make sure it says "LIVE" not "TEST")
3. Navigate to **Developers** → **API keys**
4. Copy the following keys:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal" to see it

> ⚠️ **IMPORTANT**: Never commit these keys to git or share them publicly!

## Step 2: Create Stripe Products and Prices

### Base Package Price

1. Go to **Products** → **Add product**
2. Create the base subscription:
   - **Name**: `WhiteBoar Base Package`
   - **Description**: `Monthly subscription for WhiteBoar website services`
   - **Pricing model**: Recurring
   - **Price**: `€35.00`
   - **Billing period**: Monthly
   - **Currency**: EUR
3. Click **Save product**
4. **Copy the Price ID** (starts with `price_...`) - you'll need this for `STRIPE_BASE_PACKAGE_PRICE_ID`

### Language Add-on Prices (Optional)

If you want to create a specific product for language add-ons:

1. Go to **Products** → **Add product**
2. Create language add-on:
   - **Name**: `Language Add-on`
   - **Description**: `One-time setup fee for additional language`
   - **Pricing model**: One-time
   - **Price**: `€75.00`
   - **Currency**: EUR
3. Click **Save product**
4. **Copy the Price ID** - you'll need this for `STRIPE_LANGUAGE_ADDON_PRICE_ID`

> Note: Currently, language add-ons are created as invoice items dynamically, so this product is optional.

## Step 3: Configure Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add the following variables for **Production** environment:

### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Your Stripe publishable key (visible in frontend) |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Your Stripe secret key (server-side only) |
| `STRIPE_BASE_PACKAGE_PRICE_ID` | `price_...` | The Price ID from Step 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Webhook signing secret (get from Step 4) |

### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `STRIPE_LANGUAGE_ADDON_PRICE_ID` | `price_...` | Language add-on price ID (if using product) |

## Step 4: Set Up Webhook Endpoint

Webhooks allow Stripe to notify your app when payments succeed or fail.

### 4.1 Create Webhook Endpoint

1. Go to **Developers** → **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Enter your endpoint URL (⚠️ without a trailing slash):
   ```
   https://your-domain.com/api/stripe/webhook
   ```
   Replace `your-domain.com` with your actual production domain. Stripe treats redirects as failures, so `https://your-domain.com/api/stripe/webhook/` (note trailing slash) will follow a `307/308` redirect and appear as a failed webhook.

4. Select events to listen to:
   - `invoice.paid` ✅ (REQUIRED - payment successful)
   - `customer.subscription.created` ✅
   - `customer.subscription.updated` ✅
   - `customer.subscription.deleted` ✅
   - `subscription_schedule.completed` ✅
   - `subscription_schedule.canceled` ✅
   - `charge.refunded` ✅
   - `payment_intent.payment_failed` ✅

5. Click **Add endpoint**

### 4.2 Get Webhook Signing Secret

1. After creating the endpoint, click on it to view details
2. Click **Reveal** under "Signing secret"
3. Copy the secret (starts with `whsec_...`)
4. Add this to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Configure Database Columns

The database migration for Stripe columns has already been applied in development. Verify these columns exist in production:

```sql
-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'onboarding_submissions'
  AND table_schema = 'public'
  AND column_name LIKE '%stripe%';
```

Expected columns:
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `stripe_subscription_schedule_id` (text)
- `stripe_payment_id` (text)
- `payment_amount` (integer)
- `currency` (text)
- `payment_metadata` (jsonb)

If these don't exist, run the migration:
```bash
# From your local machine
pnpm supabase db push
```

## Step 6: Deploy and Verify

### 6.1 Deploy to Vercel

1. Push your code to your git repository:
   ```bash
   git push origin main
   ```

2. Vercel will automatically deploy (if auto-deploy is enabled)

3. Or manually deploy:
   ```bash
   vercel --prod
   ```

### 6.2 Test the Webhook

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your endpoint
3. Click **Send test webhook**
4. Select event type: `invoice.paid`
5. Click **Send test webhook**
6. Check that it returns `200 OK`

### 6.3 Test a Real Payment

1. Complete the onboarding flow on your production site
2. On Step 14, use a test card in LIVE mode:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

   > ⚠️ **Note**: In production, you should use REAL cards. Use test cards only during initial verification.

3. After payment, verify in database:
   ```sql
   SELECT
     id,
     email,
     status,
     stripe_customer_id,
     stripe_subscription_id,
     payment_completed_at
   FROM onboarding_submissions
   ORDER BY created_at DESC
   LIMIT 1;
   ```

4. Verify webhook was received:
   ```sql
   SELECT
     event_id,
     event_type,
     status,
     created_at
   FROM stripe_webhook_events
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## Step 7: Monitor and Maintain

### Monitor Webhooks

1. Regularly check **Developers** → **Webhooks** in Stripe Dashboard
2. Look for failed webhook deliveries (will show errors)
3. Stripe automatically retries failed webhooks for 3 days

### Monitor Payments

1. Check **Payments** in Stripe Dashboard for successful transactions
2. Check **Subscriptions** for active subscriptions
3. Review **Customers** for customer records

### Database Monitoring

Periodically check for:
- Submissions with `status = 'submitted'` but `payment_completed_at` is old (indicates failed webhook)
- Webhook events with `status = 'failed'`

```sql
-- Find submissions that might have failed webhooks
SELECT
  id,
  email,
  status,
  created_at,
  payment_completed_at
FROM onboarding_submissions
WHERE status = 'submitted'
  AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

## Troubleshooting

### Webhook Signature Verification Failed

**Symptom**: Webhooks return 400 errors with "Invalid signature"

**Solutions**:
1. Verify `STRIPE_WEBHOOK_SECRET` in Vercel matches the webhook secret in Stripe Dashboard
2. Make sure you're using the PRODUCTION webhook secret, not the test one
3. Check that the webhook endpoint URL is correct

### Payment Not Recorded in Database

**Symptom**: Payment succeeds in Stripe but database still shows `status = 'submitted'`

**Solutions**:
1. Check webhook delivery in Stripe Dashboard - look for errors
2. Verify database columns exist (see Step 5)
3. Check application logs in Vercel for errors
4. Manually trigger webhook retry in Stripe Dashboard

### Multiple Subscriptions Created

**Symptom**: Each checkout creates 4-6 subscriptions instead of 1

**Solutions**:
1. This was fixed in commit `17d8726`
2. Make sure latest code is deployed
3. Check browser console for duplicate API calls
4. Clear browser cache and localStorage

### Customer Not Found

**Symptom**: Webhook fails with "Customer not found" or "Submission not found"

**Solutions**:
1. Verify metadata is being set on subscription schedule (check `submission_id` and `session_id`)
2. Check that the submission exists in database before payment
3. Review webhook handler logic in `/api/stripe/webhook/route.ts`

## Security Best Practices

1. ✅ **Never commit API keys** - Always use environment variables
2. ✅ **Use webhook signatures** - Always verify `stripe-signature` header
3. ✅ **HTTPS only** - Stripe requires HTTPS for production webhooks
4. ✅ **Rotate keys periodically** - Stripe allows you to roll API keys
5. ✅ **Monitor for suspicious activity** - Check Stripe Dashboard regularly
6. ✅ **Test mode for development** - Use test keys (`pk_test_` and `sk_test_`) locally
7. ✅ **Separate test/prod data** - Never mix test and production transactions

## Additional Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

## Support

If you encounter issues:
1. Check Stripe Dashboard → Developers → Logs for API errors
2. Check Vercel Dashboard → Deployments → Functions for serverless errors
3. Check database logs for SQL errors
4. Review webhook delivery attempts in Stripe Dashboard
