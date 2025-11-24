import { supabase, typedSupabase } from '@/lib/supabase'
import { retry, circuitBreakers } from '@/lib/retry'
import {
  OnboardingSession,
  OnboardingSubmission,
  OnboardingFormData,
  UploadedFile
} from '@/types/onboarding'
import { generateUUID } from '@/lib/utils'

// Transform database response to client interface
function transformSessionFromDB(dbSession: any): OnboardingSession {
  return {
    id: dbSession.id,
    email: dbSession.email,
    currentStep: dbSession.current_step,
    formData: dbSession.form_data || {},
    lastActivity: dbSession.last_activity || dbSession.updated_at,
    expiresAt: dbSession.expires_at,
    createdAt: dbSession.created_at,
    updatedAt: dbSession.updated_at,
    emailVerified: dbSession.email_verified,
    verificationCode: dbSession.verification_code,
    verificationAttempts: dbSession.verification_attempts,
    verificationLockedUntil: dbSession.verification_locked_until,
    ipAddress: dbSession.ip_address,
    userAgent: dbSession.user_agent,
    locale: dbSession.locale
  }
}

/**
 * Client-side onboarding service - uses anon key with RLS
 * NO analytics tracking or admin operations (those need service role)
 */
export class OnboardingClientService {
  /**
   * Create a new empty onboarding session (for welcome page)
   */
  static async createSession(
    locale: 'en' | 'it' = 'en'
  ): Promise<OnboardingSession> {
    return await circuitBreakers.sessionService.execute(async () => {
      const result = await retry.critical(async () => {
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 60) // 60 days from now

        // Generate a unique temporary email as placeholder (required by schema)
        const sessionId = generateUUID()
        const tempEmail = `temp-${sessionId}@whiteboar.onboarding`

        const { data, error } = await supabase
          .from('onboarding_sessions')
          .insert({
            email: tempEmail,
            current_step: 1,
            form_data: {},
            expires_at: expiresAt.toISOString(),
            locale,
            email_verified: false,
            verification_attempts: 0
          })
          .select()
          .single()

        if (error || !data) {
          throw new Error(`Failed to create session: ${error?.message || 'Unknown error'}`)
        }

        // NOTE: Analytics tracking moved to API route
        return transformSessionFromDB(data)
      })

      if (!result.success) {
        throw result.error || new Error('Failed to create session after multiple attempts')
      }

      return result.data!
    })
  }

  /**
   * Create a new onboarding session with email and name
   */
  static async createSessionWithEmail(
    email: string,
    name: string,
    locale: 'en' | 'it' = 'en'
  ): Promise<OnboardingSession> {
    const cleanEmail = email.toLowerCase().trim()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 60)

    const { data, error } = await supabase
      .from('onboarding_sessions')
      .insert({
        email: cleanEmail,
        current_step: 1,
        form_data: {
          personalInfo: {
            firstName: name.split(' ')[0] || name,
            lastName: name.split(' ').slice(1).join(' ') || '',
            email: cleanEmail
          }
        },
        expires_at: expiresAt.toISOString(),
        locale,
        email_verified: false,
        verification_attempts: 0
      })
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to create session: ${error?.message || 'Unknown error'}`)
    }

    // NOTE: Analytics tracking moved to API route
    return transformSessionFromDB(data)
  }

  /**
   * Get an existing onboarding session
   */
  static async getSession(sessionId: string): Promise<OnboardingSession | null> {
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get session: ${error.message}`)
    }

    if (!data) return null

    // Check if session is expired
    if (new Date(data.expires_at) < new Date()) {
      // NOTE: Analytics tracking moved to API route
      return null
    }

    return transformSessionFromDB(data)
  }

  /**
   * Save onboarding progress to database with debouncing
   */
  static async saveProgress(
    sessionId: string,
    formData: Partial<OnboardingFormData>,
    currentStep: number
  ): Promise<OnboardingSession> {
    const { data, error } = await supabase
      .from('onboarding_sessions')
      .update({
        current_step: currentStep,
        form_data: formData,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(`Failed to save progress: ${error?.message || 'Unknown error'}`)
    }

    // NOTE: Analytics tracking moved to API route
    return transformSessionFromDB(data)
  }

  /**
   * Refresh session expiration time
   */
  static async refreshSession(sessionId: string): Promise<void> {
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 60)

    const { error } = await supabase
      .from('onboarding_sessions')
      .update({
        expires_at: newExpiresAt.toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to refresh session: ${error.message}`)
    }
  }

  /**
   * Get uploaded files for a session
   */
  static async getUploadedFiles(
    sessionId: string,
    fileType?: string
  ): Promise<UploadedFile[]> {
    let query = supabase
      .from('onboarding_uploads')
      .select('*')
      .eq('session_id', sessionId)
      .eq('upload_completed', true)

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get uploaded files: ${error.message}`)
    }

    return data || []
  }
}

/**
 * Helper functions for API integration
 */

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new onboarding session via API
 */
export async function createOnboardingSession(
  email: string,
  name: string,
  locale: 'en' | 'it' = 'en'
): Promise<ApiResponse<OnboardingSession>> {
  try {
    const session = await OnboardingClientService.createSessionWithEmail(email, name, locale)

    // Track session creation via API route
    try {
      await fetch('/api/onboarding/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          eventType: 'session_start',
          metadata: { locale, email: email.toLowerCase().trim() }
        })
      })
    } catch (analyticsError) {
      // Don't fail the session creation if analytics fails
      console.warn('Analytics tracking failed:', analyticsError)
    }

    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create session'
    }
  }
}

/**
 * Continue existing onboarding session
 */
export async function continueOnboarding(sessionId: string): Promise<ApiResponse<OnboardingSession>> {
  try {
    const session = await OnboardingClientService.getSession(sessionId)
    if (!session) {
      return {
        success: false,
        error: 'Session not found or expired'
      }
    }

    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get session'
    }
  }
}

/**
 * Save form progress via client service
 */
export async function saveOnboardingProgress(
  sessionId: string,
  formData: OnboardingFormData,
  currentStep: number
): Promise<ApiResponse<OnboardingSession>> {
  try {
    const session = await OnboardingClientService.saveProgress(sessionId, formData, currentStep)

    // Track progress save via API route
    try {
      await fetch('/api/onboarding/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          eventType: 'auto_save',
          metadata: {
            step: currentStep,
            data_fields: Object.keys(formData).length
          }
        })
      })
    } catch (analyticsError) {
      // Don't fail the save if analytics fails
      console.warn('Analytics tracking failed:', analyticsError)
    }

    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save progress'
    }
  }
}

/**
 * Submit completed onboarding form via API
 */
export async function submitOnboarding(
  sessionId: string,
  formData: OnboardingFormData,
  completionTimeSeconds?: number
): Promise<OnboardingSubmission> {
  return await circuitBreakers.submissionService.execute(async () => {
    const result = await retry.critical(async () => {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          formData,
          completionTimeSeconds
        })
      })

      const apiResult = await response.json()

      if (!response.ok) {
        throw new Error(apiResult.error || 'Failed to submit onboarding')
      }

      if (!apiResult.success || !apiResult.data) {
        throw new Error('Invalid response from submission API')
      }

      return apiResult.data
    })

    if (!result.success) {
      throw result.error || new Error('Failed to submit onboarding after multiple attempts')
    }

    return result.data!
  })
}