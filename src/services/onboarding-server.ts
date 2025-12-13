import { createServiceClient } from '@/lib/supabase'
import {
  OnboardingSession,
  OnboardingSubmission,
  OnboardingFormData,
  UploadedFile,
  AnalyticsEvent,
  AnalyticsEventType
} from '@/types/onboarding'

/**
 * Server-side onboarding service - uses service role key
 * ONLY for analytics tracking and admin operations
 * NEVER call from client-side code - API routes only!
 */
export class OnboardingServerService {
  /**
   * Track analytics event (SERVER-SIDE ONLY)
   */
  static async trackEvent(
    sessionId: string,
    eventType: AnalyticsEventType,
    metadata: Record<string, any> = {},
    stepNumber?: number,
    fieldName?: string,
    category: string = 'user_action',
    durationMs?: number
  ): Promise<void> {
    try {
      // Add request context if available
      const eventData: any = {
        session_id: sessionId,
        event_type: eventType,
        step_number: stepNumber,
        field_name: fieldName,
        metadata,
        category,
        duration_ms: durationMs,
        created_at: new Date().toISOString()
      }

      // Use service client for analytics (no user restrictions)
      const serviceClient = createServiceClient()

      const { error } = await serviceClient
        .from('onboarding_analytics')
        .insert(eventData)

      if (error) {
        console.error('Failed to track event:', error)
        // Don't throw - analytics failures shouldn't break user flow
      }
    } catch (error) {
      console.error('Error tracking analytics event:', error)
      // Don't throw - analytics failures shouldn't break user flow
    }
  }

  /**
   * Get analytics for session (ADMIN ONLY)
   */
  static async getSessionAnalytics(sessionId: string): Promise<AnalyticsEvent[]> {
    const serviceClient = createServiceClient()

    try {
      const { data, error } = await serviceClient
        .from('onboarding_analytics')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(`Failed to get session analytics: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting session analytics:', error)
      return []
    }
  }

  /**
   * Submit onboarding form (SERVER-SIDE ONLY)
   */
  static async submitOnboarding(
    sessionId: string,
    formData: OnboardingFormData,
    completionTimeSeconds?: number
  ): Promise<OnboardingSubmission> {
    const serviceClient = createServiceClient()

    try {
      // Get session details first (using service client to bypass RLS)
      const { data: session, error: sessionError } = await serviceClient
        .from('onboarding_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError || !session) {
        throw new Error('Session not found or expired')
      }

      // Skip email verification in development for testing
      if (!session.email_verified && process.env.NODE_ENV !== 'development') {
        throw new Error('Email must be verified before submission')
      }

      // Auto-verify email in development if not already verified
      if (!session.email_verified && process.env.NODE_ENV === 'development') {
        await serviceClient
          .from('onboarding_sessions')
          .update({ email_verified: true })
          .eq('id', sessionId)
      }

      const submissionData = {
        session_id: sessionId,
        email: formData.email || session.email, // Use form email if available, fallback to session email
        business_name: formData.businessName || 'Unnamed Business',
        form_data: formData,
        completion_time_seconds: completionTimeSeconds,
        status: 'submitted'
      }

      const { data, error } = await serviceClient
        .from('onboarding_submissions')
        .insert(submissionData)
        .select()
        .single()

      if (error || !data) {
        throw new Error(`Failed to submit onboarding: ${error?.message || 'Unknown error'}`)
      }

      // Track completion
      await this.trackEvent(sessionId, 'form_submit', {
        business_name: formData.businessName,
        completion_time_seconds: completionTimeSeconds,
        total_steps: 12
      })

      return data
    } catch (error) {
      console.error('Error submitting onboarding:', error)
      throw error
    }
  }

  /**
   * Record file upload (SERVER-SIDE ONLY)
   */
  static async recordFileUpload(
    sessionId: string,
    fileType: string,
    fileUrl: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    dimensions?: { width: number; height: number }
  ): Promise<UploadedFile> {
    const serviceClient = createServiceClient()

    try {
      const uploadData: any = {
        session_id: sessionId,
        file_type: fileType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        upload_completed: true,
        virus_scan_status: 'clean', // Assume clean for now
        is_processed: false
      }

      if (dimensions) {
        uploadData.width = dimensions.width
        uploadData.height = dimensions.height
      }

      const { data, error } = await serviceClient
        .from('onboarding_uploads')
        .insert(uploadData)
        .select()
        .single()

      if (error || !data) {
        throw new Error(`Failed to record file upload: ${error?.message || 'Unknown error'}`)
      }

      // Track file upload
      await this.trackEvent(sessionId, 'file_upload_success', {
        file_type: fileType,
        file_size: fileSize,
        mime_type: mimeType,
        dimensions
      })

      return data
    } catch (error) {
      console.error('Error recording file upload:', error)
      throw error
    }
  }

  /**
   * Generate verification code (SERVER-SIDE ONLY)
   */
  static async generateVerificationCode(
    sessionId: string,
    email: string
  ): Promise<string> {
    const serviceClient = createServiceClient()

    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + 15) // 15 minutes
      const normalizedEmail = email.toLowerCase().trim()

      // First, check if this email already exists in another session
      const { data: existingSessions, error: checkError } = await serviceClient
        .from('onboarding_sessions')
        .select('id, email')
        .eq('email', normalizedEmail)
        .neq('id', sessionId)

      if (checkError) {
        throw new Error(`Failed to check existing sessions: ${checkError.message}`)
      }

      // If email exists in another session, we need to handle it properly
      if (existingSessions && existingSessions.length > 0) {
        // Check if any of the existing sessions have completed submissions
        const { data: existingSubmissions, error: submissionError } = await serviceClient
          .from('onboarding_submissions')
          .select('id, session_id')
          .in('session_id', existingSessions.map(s => s.id))

        if (submissionError) {
          console.warn('Failed to check existing submissions:', submissionError.message)
        }

        // Allow reusing email if no submissions exist or in production environment
        // This allows users to restart onboarding with the same email
        if (!existingSubmissions || existingSubmissions.length === 0) {
          // Delete old sessions with the same email to allow new onboarding
          const { error: deleteError } = await serviceClient
            .from('onboarding_sessions')
            .delete()
            .eq('email', normalizedEmail)
            .neq('id', sessionId)

          if (deleteError) {
            console.warn('Failed to delete old sessions:', deleteError.message)
            // Continue anyway - the update might still work
          }
        } else {
          // If submissions exist, we still allow it but log for tracking
          console.log(`Email ${normalizedEmail} has existing submissions, allowing re-onboarding`)

          // Delete only unverified sessions to clean up
          const { error: deleteError } = await serviceClient
            .from('onboarding_sessions')
            .delete()
            .eq('email', normalizedEmail)
            .neq('id', sessionId)
            .is('email_verified', false)

          if (deleteError) {
            console.warn('Failed to delete unverified sessions:', deleteError.message)
          }
        }
      }

      // Now attempt to update the current session
      const { error } = await serviceClient
        .from('onboarding_sessions')
        .update({
          email: normalizedEmail,
          verification_code: code,
          verification_attempts: 0,
          verification_locked_until: null,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        // If we still get a unique constraint error, try to handle it gracefully
        if (error.code === '23505' && error.message.includes('onboarding_sessions_email_key')) {
          // Try one more time to clean up old sessions
          console.log(`Unique constraint error for ${normalizedEmail}, attempting cleanup`)

          const { error: cleanupError } = await serviceClient
            .from('onboarding_sessions')
            .delete()
            .eq('email', normalizedEmail)
            .neq('id', sessionId)

          if (!cleanupError) {
            // Retry the update after cleanup
            const { error: retryError } = await serviceClient
              .from('onboarding_sessions')
              .update({
                email: normalizedEmail,
                verification_code: code,
                verification_attempts: 0,
                verification_locked_until: null,
                last_activity: new Date().toISOString()
              })
              .eq('id', sessionId)

            if (!retryError) {
              // Success after retry
              await this.trackEvent(sessionId, 'email_verification_sent', { code_length: 6, retry: true })
              return code
            }
          }

          // If still failing, log but don't block the user
          console.error('Could not resolve email conflict, but allowing to proceed:', normalizedEmail)
        }

        throw new Error(`Failed to generate verification code: ${error.message}`)
      }

      await this.trackEvent(sessionId, 'email_verification_sent', { code_length: 6 })

      return code
    } catch (error) {
      console.error('Error generating verification code:', error)
      throw error
    }
  }

  /**
   * Verify email code (SERVER-SIDE ONLY)
   */
  static async verifyEmail(
    sessionId: string,
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    const serviceClient = createServiceClient()

    try {
      // Development/CI/Preview bypass for testing
      const isTestEnvironment = process.env.NODE_ENV === 'development' ||
                                 process.env.CI === 'true' ||
                                 process.env.VERCEL_ENV === 'preview' ||
                                 process.env.VERCEL_ENV === 'development'
      if (isTestEnvironment && (code === 'DEV123' || code === '123456')) {
        const { error } = await serviceClient
          .from('onboarding_sessions')
          .update({
            email_verified: true,
            verification_code: null,
            verification_attempts: 0,
            verification_locked_until: null,
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (error) {
          throw new Error(`Failed to update verification status: ${error.message}`)
        }

        await this.trackEvent(sessionId, 'email_verification_success', {
          attempts_used: 1,
          dev_bypass: true
        })

        return { success: true }
      }
      // Get current session
      const { data: session, error: fetchError } = await serviceClient
        .from('onboarding_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        return { success: false, error: 'Session not found' }
      }

      // Check if verification is locked
      if (session.verification_locked_until && new Date(session.verification_locked_until) > new Date()) {
        await this.trackEvent(sessionId, 'email_verification_failed', {
          reason: 'locked',
          locked_until: session.verification_locked_until
        })
        return { success: false, error: 'Too many failed attempts. Please try again later.' }
      }

      const maxAttempts = 5
      const newAttempts = (session.verification_attempts || 0) + 1

      if (session.verification_code === code.trim()) {
        // Success - mark email as verified
        const { error } = await serviceClient
          .from('onboarding_sessions')
          .update({
            email_verified: true,
            verification_code: null,
            verification_attempts: 0,
            verification_locked_until: null,
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (error) {
          throw new Error(`Failed to update verification status: ${error.message}`)
        }

        await this.trackEvent(sessionId, 'email_verification_success', {
          attempts_used: newAttempts,
          email: session.email
        })

        return { success: true }
      } else {
        // Failed verification
        const lockTime = newAttempts >= maxAttempts ?
          new Date(Date.now() + 15 * 60 * 1000).toISOString() : // 15 minutes
          null

        const { error } = await serviceClient
          .from('onboarding_sessions')
          .update({
            verification_attempts: newAttempts,
            verification_locked_until: lockTime,
            last_activity: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (error) {
          throw new Error(`Failed to update verification attempts: ${error.message}`)
        }

        const attemptsRemaining = Math.max(0, maxAttempts - newAttempts)

        await this.trackEvent(sessionId, 'email_verification_failed', {
          attempts_used: newAttempts,
          attempts_remaining: attemptsRemaining,
          locked: lockTime !== null
        })

        if (lockTime) {
          return { success: false, error: 'Too many failed attempts. Account locked for 15 minutes.' }
        }

        return { success: false, error: `Invalid code. ${attemptsRemaining} attempts remaining.` }
      }
    } catch (error) {
      console.error('Error verifying email:', error)
      return { success: false, error: 'Verification failed. Please try again.' }
    }
  }

  /**
   * Get submissions with filters (ADMIN ONLY)
   */
  static async getSubmissions(filters: {
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  } = {}): Promise<{ submissions: OnboardingSubmission[]; total: number }> {
    const serviceClient = createServiceClient()

    try {
      let query = serviceClient
        .from('onboarding_submissions')
        .select('*', { count: 'exact' })

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      query = query.order('created_at', { ascending: false })

      if (filters.limit) {
        query = query.limit(filters.limit)
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
      }

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to get submissions: ${error.message}`)
      }

      return {
        submissions: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error getting submissions:', error)
      return { submissions: [], total: 0 }
    }
  }

  /**
   * Update submission status (ADMIN ONLY)
   */
  static async updateSubmissionStatus(
    submissionId: string,
    status: string,
    adminNotes?: string
  ): Promise<void> {
    const serviceClient = createServiceClient()

    try {
      const updateData: any = { status }

      if (adminNotes) {
        updateData.admin_notes = adminNotes
      }

      if (status === 'preview_sent') {
        updateData.preview_sent_at = new Date().toISOString()
      } else if (status === 'paid') {
        updateData.payment_completed_at = new Date().toISOString()
      }

      const { error } = await serviceClient
        .from('onboarding_submissions')
        .update(updateData)
        .eq('id', submissionId)

      if (error) {
        throw new Error(`Failed to update submission status: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating submission status:', error)
      throw error
    }
  }
}