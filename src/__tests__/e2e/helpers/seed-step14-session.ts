/**
 * Test helper to seed a pre-filled Step 14 session
 * Eliminates the need to navigate through all 14 steps in every test
 */

import { Locale } from '@/lib/i18n'

/**
 * Helper to get headers with Vercel protection bypass if available
 */
function getHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  }

  // Add Vercel protection bypass header if secret is available (for CI testing)
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    headers['x-vercel-protection-bypass'] = bypassSecret
    headers['Cookie'] = `__vercel_protection_bypass=${bypassSecret}`
  }

  return headers
}

export interface SeedStep14Options {
  /** Additional languages to include in the session (e.g., ['de', 'fr']) */
  additionalLanguages?: string[]
  /** Custom email (auto-generated if not provided) */
  email?: string
  /** Locale (defaults to 'en') */
  locale?: Locale
}

export interface SeedStep14Result {
  /** Session ID */
  sessionId: string
  /** Submission ID (needed for cleanup) */
  submissionId: string
  /** Email used for the session */
  email: string
  /** Direct URL to Step 14 */
  url: string
  /** Zustand store JSON for localStorage injection */
  zustandStore: string
}

/**
 * Seed a pre-filled Step 14 test session
 *
 * @param options - Configuration options
 * @returns Session details including direct URL to Step 14
 *
 * @example
 * // Basic usage
 * const seed = await seedStep14TestSession()
 * await page.addInitScript((store) => {
 *   localStorage.setItem('wb-onboarding-store', store)
 * }, seed.zustandStore)
 * await page.goto(`http://localhost:3783${seed.url}`)
 *
 * @example
 * // With language add-ons
 * const seed = await seedStep14TestSession({ additionalLanguages: ['de', 'fr'] })
 * await page.addInitScript((store) => {
 *   localStorage.setItem('wb-onboarding-store', store)
 * }, seed.zustandStore)
 * await page.goto(`http://localhost:3783${seed.url}`)
 */
export async function seedStep14TestSession(
  options: SeedStep14Options = {}
): Promise<SeedStep14Result> {
  const baseUrl = (process.env.BASE_URL && process.env.BASE_URL.trim().length > 0)
    ? process.env.BASE_URL.replace(/\/$/, '')
    : 'http://localhost:3783'

  const response = await fetch(`${baseUrl}/api/test/seed-session`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email: options.email,
      locale: options.locale || 'en',
      currentStep: 14,
      additionalLanguages: options.additionalLanguages || []
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`Failed to seed Step 14 session: ${error.error || response.statusText}`)
  }

  const data = await response.json()

  if (!data.success) {
    throw new Error(`Seed session failed: ${data.error || 'Unknown error'}`)
  }

  // Ensure submission is readable before proceeding (handles eventual consistency)
  const submissionId = data.submissionId as string
  const sessionId = data.sessionId as string
  const verificationUrl = `${baseUrl}/api/onboarding/get-submission?sessionId=${sessionId}&submissionId=${submissionId}&includeFormData=true`

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const check = await fetch(verificationUrl, {
        headers: getHeaders()
      })
      if (attempt === 9 && !check.ok) {
        console.warn('Submission not yet available after seeding', {
          sessionId: data.sessionId,
          submissionId,
          status: check.status
        })
      }
      if (check.ok) {
        break
      }
    } catch (err) {
      if (attempt === 9) {
        console.warn('Submission check failed', {
          sessionId: data.sessionId,
          submissionId,
          error: err instanceof Error ? err.message : err
        })
      }
      // ignore and retry
    }
    await new Promise(resolve => setTimeout(resolve, 400))
  }

  // Build Zustand store structure matching persist config in onboarding.ts
  const zustandStore = {
    state: {
      sessionId: data.sessionId,
      currentStep: 14,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      formData: data.formData, // Full form data from seed API
      sessionExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      isSessionExpired: false
    },
    version: 1 // Must match version in onboarding.ts
  }

  return {
    sessionId: data.sessionId,
    submissionId: data.submissionId,
    email: data.email,
    url: data.url,
    zustandStore: JSON.stringify(zustandStore)
  }
}

/**
 * Clean up test session and submission from database
 *
 * @param sessionId - Session ID to clean up
 * @param submissionId - Submission ID to clean up
 *
 * @example
 * const { sessionId, submissionId } = await seedStep14TestSession()
 * try {
 *   // ... run tests
 * } finally {
 *   await cleanupTestSession(sessionId, submissionId)
 * }
 */
export async function cleanupTestSession(sessionId: string, submissionId?: string): Promise<void> {
  const baseUrl = (process.env.BASE_URL && process.env.BASE_URL.trim().length > 0)
    ? process.env.BASE_URL.replace(/\/$/, '')
    : 'http://localhost:3783'

  try {
    const response = await fetch(`${baseUrl}/api/test/cleanup-session`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sessionId, submissionId })
    })

    if (response.ok) {
      const result = await response.json().catch(() => null)
      if (!result?.success) {
        console.warn('Cleanup API responded without success flag', result)
      }
      return
    }

    console.warn('Cleanup API request failed', {
      status: response.status,
      statusText: response.statusText
    })
  } catch (error) {
    console.warn('Cleanup API request error', error)
  }

  // Fallback: direct Supabase cleanup when service credentials are available
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Cannot perform Supabase cleanup fallback: Missing Supabase credentials')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (submissionId) {
    await supabase.from('onboarding_submissions').delete().eq('id', submissionId)
  }

  await supabase.from('onboarding_uploads').delete().eq('session_id', sessionId)
  await supabase.from('onboarding_analytics').delete().eq('session_id', sessionId)
  await supabase.from('onboarding_sessions').delete().eq('id', sessionId)
}
