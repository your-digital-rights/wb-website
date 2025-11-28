# Payment Architecture v2

## Overview

This document outlines the upcoming migration plan for Step 14 (Stripe checkout) to a backend-driven architecture. The goal is to move Stripe orchestration out of the browser, improve testability, and keep the custom WhiteBoar UX intact.

## Motivation

1. **Brittle Tests & Slow Feedback**
   - Current Playwright suite orchestrates live Stripe flows, webhooks, and Supabase verification inside a single spec. One flake stalls the entire file.
   - Shared browser context (cookies, sessions, banner state) causes cascading failures; small regressions force multi-day investigations.

2. **UI ↔️ Backend Coupling**
   - The client owns business rules (coupon validation, add-on math, PaymentIntent creation). Any change requires touching both front- and back-end.
   - Browser needs privileged knowledge (submission IDs, session IDs, Supabase status polling), which is hard to reason about and secure.

3. **Operational Risk**
   - Multiple Stripe mutations (customer, schedule, invoice) happen from the browser, without centralized idempotency. Network hiccups can create orphaned subscriptions.
   - Debugging requires manual inspection of Stripe logs, Supabase rows, Playwright artifacts.

4. **Parity & Reuse**
   - Future channels (mobile, CLI, automated onboarding) would have to duplicate this logic. A server controller lets any client reuse the same flow.

## Requirements

### Functional
- **Controller API**
  - POST `/api/stripe/checkout` accepts `{ submissionId, sessionId, additionalLanguages, discountCode }`.
  - Validates submission status (“submitted”), ensures email/terms readiness.
  - Creates/updates Stripe customer, subscription schedule, subscription, invoice items, optional coupons, metadata.
  - Finalizes invoice, obtains PaymentIntent or SetupIntent, persists all IDs (customer, subscription, schedule, payment, invoice) plus pricing metadata in `onboarding_submissions`.
  - Returns `{ clientSecret, summary (totals, recurring amounts, savings, languages), submissionId, stripeIds }`.
- **Webhook Updates**
  - `invoice.paid` establishes `status='paid'`, `payment_amount`, `payment_completed_at`, analytics/email notifications.
  - `setup_intent.succeeded` attaches payment method and logs analytics; must tolerate missing customers/subscriptions (already fixed).
- **Frontend UX**
  - Continues to show inline order summary, discount, add-ons.
  - Uses controller response as single source of truth for pricing (no duplicate calculations).
  - Collects card details via Stripe Elements and confirms using the returned client secret.

### Non-Functional / Technical
- **Idempotency**: Controller must be callable multiple times with same submission; use `stripe-idempotency-key` derived from submission/session. Apply idempotency keys per Stripe mutation (customer, schedule, subscription, invoice items, coupons, PaymentIntent/SetupIntent) so retries on 429/5xx are safe.
- **Security**: All privileged Stripe calls remain server-side; client sees only publishable key + client secret. Webhooks must verify `Stripe-Signature`, reject expired signatures, and dedupe by `event.id`.
- **Logging/Monitoring**: Structured logs for each controller invocation (submission ID, Stripe IDs, Stripe Request-Ids, timing). Emit metrics for success/failure to alerting system and surface request IDs for Stripe support.
- **Rate Limiting/Resiliency**: Use exponential backoff with jitter on 429/409/5xx, honor `Retry-After`, and coalesce duplicate in-flight requests per submission/session. Cache static reads (e.g., Prices) and avoid polling.
- **Cleanup**: Maintain ability to cancel pending schedules/subscriptions on retries or when user restarts Step 14. Also expire/cancel incomplete PaymentIntents/SetupIntents and void draft invoices created during retries to avoid surprise captures.

### Testing Requirements
- **Integration (Jest + Supabase)**
  - Happy path, language add-ons, 20% discount, 100% discount, invalid coupon/error handling.
  - Webhook tests verifying DB updates without Playwright.
- **Playwright**
  - Few full-stack tests hitting real Stripe (smoke coverage).
  - Majority of scenarios stub `/api/stripe/checkout` to validate UI-only flows (error states, form validation, translations).
  - All specs use fixtures to set cookie consent and seed sessions to avoid state leakage.
- **Stripe Tooling**
  - Use Stripe CLI to replay webhooks locally and validate signature handling.
  - Use Stripe Test Clocks for subscription/schedule time-travel (renewals, proration) without long waits.
- **Mock Data**
  - Provide JSON fixtures for pricing summaries so designers/devs can iterate quickly without Stripe.

### Operational Requirements
- Document new environment variables (controller secret, feature flags).
- Provide runbooks for:
  - Rotating Stripe keys / env configuration.
    - Use restricted keys for CI/test where possible; isolate keys per environment.
  - Inspecting controller logs, Stripe dashboards, and Supabase rows.
  - Rolling back to legacy flow if necessary (feature flag/ENV switch).
  - Capturing `Stripe-Request-Id` and `event.id` for support/debug and replaying via Stripe CLI.
- Update CI to run new integration suite plus reduced set of Playwright specs (with Stripe mocked by default).

### Migration Requirements
- Deliver controller behind feature flag (`PAYMENT_CONTROLLER_V2`).
- Support dual mode (legacy client orchestration and new controller) until rollout complete.
- Backfill any missing data columns (e.g., `stripe_subscription_schedule_id`) before enabling the flag globally.

## Goals

- Centralize all Stripe API calls on the server.
- Reduce test brittleness by eliminating browser-orchestrated webhooks.
- Maintain in-app UX (language add-ons, discount previews) without redirecting to hosted Checkout.
- Provide a clear path for integration tests vs end-to-end UI tests.

## Architecture Summary

### Current State
- Client-side Step 14 page directly calls Stripe (customers, subscription schedules, invoice items, coupons, finalize invoice) and polls Supabase for completed data.
- Playwright tests must wait for real Stripe webhooks and Supabase writes, making the suite slow and fragile.

### Proposed State
1. **Backend Payment Controller**
   - New route (e.g., `/api/stripe/checkout`).
   - Responsibilities:
     - Validate submission/session state.
     - Create/update Stripe customer, schedule, subscription, invoice items.
     - Attach coupons/metadata, finalize invoice, derive PaymentIntent/SetupIntent with `payment_behavior=default_incomplete` and `save_default_payment_method`/`setup_future_usage` set so off-session renewals succeed.
     - Persist Stripe IDs + payment metadata to Supabase in the same request.
     - Return `{ clientSecret, pricingSummary, submissionId, debugIds }` to the client.
   - Server handles idempotency, retries, and structured logging.

2. **Frontend Step 14**
   - Calls the controller, receives client secret + summary, renders Stripe Elements to confirm payment.
   - Displays prices/discounts from the server response (no more client-side recalculation).
   - Tracks state transitions (loading, success, failure) without touching Stripe directly.

3. **Webhook Simplification**
   - Webhooks only need to update status to `paid`, record timestamps, send emails/analytics.
   - Verify signatures, dedupe by `event.id`, respond with 2xx quickly, and offload heavier work to a queue/async worker.
   - Metadata lookup remains but is simpler because the controller already saved all IDs.

4. **Testing Strategy**
   - **Integration (Jest)**: focus on `/api/stripe/checkout`, mocking Stripe where appropriate and verifying Supabase updates; separate tests for webhook handlers.
   - **Playwright**:
     - A few real payments (happy path, language add-ons, 100% discount) to exercise the end-to-end flow.
     - Majority of scenarios use API mocking (intercept `/api/stripe/checkout`) to validate UI states quickly.
     - Split Step-14 tests into smaller specs; all use `setCookieConsentBeforeLoad` in fixtures.

## Work Breakdown

1. **Backend Controller**
   - Add new route & service layer.
   - Implement idempotent Stripe orchestration.
   - Persist data in Supabase and return response for client.
   - Unit + integration tests for controller logic (mock Stripe + Supabase fixtures).

2. **Webhook & Service Updates**
   - Remove redundant lookup paths now handled by the controller.
   - Ensure analytics/emails are triggered after DB write success.
   - Align metadata expectations (submission/session IDs set once in controller).

3. **Frontend Refactor**
   - Update Step 14 React components to call the controller.
   - Replace client-side pricing logic with server-provided summary.
   - Simplify state machine around Stripe Elements (confirm only).
   - Introduce shared hooks/services for pricing display to avoid code duplication.

4. **Testing Revamp**
   - Rewrite Step 14 Playwright specs to use fixtures, mocks, and fast flows.
   - Move DB assertions into Jest integration tests.
   - Keep a small number of full Stripe E2Es for confidence.

5. **Documentation & Ops**
   - Update README/docs/checklists for new env vars, controller API contract, testing strategy.
   - Add monitoring/logging notes for controller & webhook metrics.

## Risks & Mitigations
- **Feature Parity**: ensure add-on pricing/discount logic matches current behavior by reusing the same helper functions server-side.
- **Migration Path**: deploy controller behind a feature flag, run parallel tests until confidence is high.
- **Testing Load**: Use Stripe test mode with explicit cleanup scripts to avoid hitting limits.

## Next Steps
1. **Stub Controller**
   - Implement `/api/stripe/checkout` returning mock data plus logging; update frontend to call it behind feature flag.
2. **Full Controller Implementation**
   - Port Stripe orchestration + Supabase persistence into the controller, accompanied by integration tests.
3. **Frontend Migration**
   - Flip Step 14 to consume controller output, remove deprecated client-side Stripe logic, ensure UI regression tests pass.
4. **Testing & Rollout**
   - Update Playwright suite (mocked + real flows), ensure CI green with new architecture, gradually enable feature flag in staging/production.
5. **Documentation & Ops**
   - Finalize README/docs updates, add dashboards/alerts for controller metrics, and decommission legacy flow once stable.
