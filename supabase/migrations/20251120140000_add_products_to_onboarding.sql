-- Migration: Add products column to onboarding_sessions table
-- Feature: Enhanced Products & Services Entry (Step 11)
-- Date: 2025-11-20

-- Add products JSONB column with default empty array
ALTER TABLE onboarding_sessions
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Add GIN index for efficient JSONB querying
-- (useful for post-onboarding analytics and product searches)
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_products
ON onboarding_sessions
USING GIN (products);

-- Add comment for documentation
COMMENT ON COLUMN onboarding_sessions.products IS 'Array of products with details (name, description, price, photos). Max 6 products per session.';
