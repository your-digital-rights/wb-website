-- Add Stripe invoice + pricing summary fields for payment controller v2
ALTER TABLE onboarding_submissions
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_summary JSONB,
  ADD COLUMN IF NOT EXISTS payment_tax_amount INTEGER,
  ADD COLUMN IF NOT EXISTS payment_tax_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_onboarding_submissions_stripe_invoice_id
  ON onboarding_submissions(stripe_invoice_id);

COMMENT ON COLUMN onboarding_submissions.stripe_invoice_id IS 'Stripe invoice ID generated for initial payment';
COMMENT ON COLUMN onboarding_submissions.payment_summary IS 'Pricing summary returned by Stripe controller (totals, recurring, line items)';
COMMENT ON COLUMN onboarding_submissions.payment_tax_amount IS 'Total tax amount (cents) for the initial invoice';
COMMENT ON COLUMN onboarding_submissions.payment_tax_currency IS 'Currency for payment_tax_amount';
