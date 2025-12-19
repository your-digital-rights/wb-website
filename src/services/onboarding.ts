import { supabase, createServiceClient, typedSupabase } from '@/lib/supabase'
import {
  OnboardingSession,
  OnboardingSubmission,
  OnboardingFormData,
  AnalyticsEvent,
  AnalyticsEventType,
  AnalyticsCategory,
  UploadedFile,
  ApiResponse
} from '@/types/onboarding'
import { Locale } from '@/lib/i18n'

// =============================================================================
// ONBOARDING SERVICE CLASS
// =============================================================================

export class OnboardingService {
  
  // ===========================================================================
  // SESSION MANAGEMENT
  // ===========================================================================
  
  /**
   * Create a new empty onboarding session (for welcome page)
   */
  static async createSession(
    email: string,
    name: string,
    locale: Locale = 'en'
  ): Promise<OnboardingSession> {
    try {
      const sessionData = {
        email,
        current_step: 1,
        form_data: { firstName: name.split(' ')[0], lastName: name.split(' ')[1] || '' },
        email_verified: false,
        locale,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        verification_code: null,
        verification_attempts: 0
      }

      const { data, error } = await supabase
        .from('onboarding_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create session:', error)
        throw new Error(`Failed to create session: ${error.message}`)
      }

      // Track session creation
      await this.trackEvent(data.id, 'session_start', {
        locale
      })

      return this.mapSessionFromDB(data)
    } catch (error) {
      console.error('Create session error:', error)
      throw error instanceof Error ? error : new Error('Failed to create session')
    }
  }

  /**
   * Create a new onboarding session with email and name
   */
  static async createSessionWithEmail(
    email: string,
    name: string,
    locale: Locale = 'en'
  ): Promise<OnboardingSession> {
    try {
      const sessionData = {
        email: email.toLowerCase().trim(),
        current_step: 1,
        form_data: { name, email },
        email_verified: false,
        locale,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        verification_code: Math.floor(100000 + Math.random() * 900000).toString(), // 6-digit code
        verification_attempts: 0
      }

      const { data, error } = await supabase
        .from('onboarding_sessions')
        .insert(sessionData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create session:', error)
        throw new Error(`Failed to create session: ${error.message}`)
      }

      // Track session creation
      await this.trackEvent(data.id, 'session_start', {
        locale,
        email: email.toLowerCase().trim()
      })

      return this.mapSessionFromDB(data)
    } catch (error) {
      console.error('Create session error:', error)
      throw error instanceof Error ? error : new Error('Failed to create session')
    }
  }

  /**
   * Get session by ID
   */
  static async getSession(sessionId: string): Promise<OnboardingSession | null> {
    try {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null
        }
        throw new Error(`Failed to get session: ${error.message}`)
      }

      // Check if session is expired
      if (new Date(data.expires_at) < new Date()) {
        await this.trackEvent(sessionId, 'session_expired')
        return null
      }

      return this.mapSessionFromDB(data)
    } catch (error) {
      console.error('Get session error:', error)
      throw error instanceof Error ? error : new Error('Failed to get session')
    }
  }

  /**
   * Update session with form progress
   */
  static async saveProgress(
    sessionId: string,
    formData: Partial<OnboardingFormData>,
    currentStep: number
  ): Promise<void> {
    try {
      const updateData = {
        form_data: formData,
        current_step: currentStep,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to save progress: ${error.message}`)
      }

      // Track progress save
      await this.trackEvent(sessionId, 'auto_save', {
        step: currentStep,
        data_fields: Object.keys(formData).length
      })
    } catch (error) {
      console.error('Save progress error:', error)
      throw error instanceof Error ? error : new Error('Failed to save progress')
    }
  }

  /**
   * Refresh session expiration
   */
  static async refreshSession(sessionId: string): Promise<void> {
    try {
      const newExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase
        .from('onboarding_sessions')
        .update({ 
          expires_at: newExpiresAt,
          last_activity: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to refresh session: ${error.message}`)
      }
    } catch (error) {
      console.error('Refresh session error:', error)
      throw error instanceof Error ? error : new Error('Failed to refresh session')
    }
  }

  // ===========================================================================
  // EMAIL VERIFICATION
  // ===========================================================================

  /**
   * Generate and save new verification code
   */
  static async generateVerificationCode(sessionId: string): Promise<string> {
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      const { error } = await supabase
        .from('onboarding_sessions')
        .update({ 
          verification_code: code,
          verification_attempts: 0,
          verification_locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) {
        throw new Error(`Failed to generate verification code: ${error.message}`)
      }

      await this.trackEvent(sessionId, 'email_verification_sent', { code_length: 6 })
      
      return code
    } catch (error) {
      console.error('Generate verification code error:', error)
      throw error instanceof Error ? error : new Error('Failed to generate verification code')
    }
  }

  /**
   * Verify email with code
   */
  static async verifyEmail(
    sessionId: string, 
    code: string
  ): Promise<{ success: boolean; attemptsRemaining: number; lockedUntil?: string }> {
    try {
      // Get current session
      const { data: session, error: fetchError } = await supabase
        .from('onboarding_sessions')
        .select('verification_code, verification_attempts, verification_locked_until, email')
        .eq('id', sessionId)
        .single()

      if (fetchError || !session) {
        throw new Error('Session not found')
      }

      // Check if verification is locked
      if (session.verification_locked_until && new Date(session.verification_locked_until) > new Date()) {
        await this.trackEvent(sessionId, 'email_verification_failed', { 
          reason: 'locked',
          locked_until: session.verification_locked_until
        })
        
        return { 
          success: false, 
          attemptsRemaining: 0,
          lockedUntil: session.verification_locked_until
        }
      }

      // Check code
      const isCodeValid = session.verification_code === code
      const newAttempts = (session.verification_attempts || 0) + 1
      const maxAttempts = 5
      const attemptsRemaining = Math.max(0, maxAttempts - newAttempts)

      if (isCodeValid) {
        // Success - mark email as verified
        const { error: updateError } = await supabase
          .from('onboarding_sessions')
          .update({
            email_verified: true,
            verification_code: null,
            verification_attempts: 0,
            verification_locked_until: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId)

        if (updateError) {
          throw new Error(`Failed to verify email: ${updateError.message}`)
        }

        await this.trackEvent(sessionId, 'email_verification_success', {
          attempts_used: newAttempts,
          email: session.email
        })

        return { success: true, attemptsRemaining: maxAttempts }
      } else {
        // Failed attempt
        const updateData: any = {
          verification_attempts: newAttempts,
          updated_at: new Date().toISOString()
        }

        // Lock if max attempts reached
        if (attemptsRemaining === 0) {
          updateData.verification_locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
        }

        const { error: updateError } = await supabase
          .from('onboarding_sessions')
          .update(updateData)
          .eq('id', sessionId)

        if (updateError) {
          throw new Error(`Failed to update verification attempts: ${updateError.message}`)
        }

        await this.trackEvent(sessionId, 'email_verification_failed', {
          attempts_used: newAttempts,
          attempts_remaining: attemptsRemaining,
          locked: attemptsRemaining === 0
        })

        return { 
          success: false, 
          attemptsRemaining,
          lockedUntil: attemptsRemaining === 0 ? updateData.verification_locked_until : undefined
        }
      }
    } catch (error) {
      console.error('Verify email error:', error)
      throw error instanceof Error ? error : new Error('Failed to verify email')
    }
  }

  // ===========================================================================
  // FORM SUBMISSION
  // ===========================================================================

  /**
   * Submit completed onboarding form
   */
  static async submitOnboarding(
    sessionId: string,
    formData: OnboardingFormData,
    completionTimeSeconds?: number
  ): Promise<OnboardingSubmission> {
    const serviceClient = createServiceClient()
    
    try {
      // Get session details
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error('Session not found or expired')
      }

      if (!session.emailVerified) {
        throw new Error('Email must be verified before submission')
      }

      const submissionData = {
        session_id: sessionId,
        email: formData.email,
        business_name: formData.businessName,
        form_data: formData,
        completion_time_seconds: completionTimeSeconds,
        status: 'submitted'
      }

      const { data, error } = await serviceClient
        .from('onboarding_submissions')
        .insert(submissionData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to submit onboarding: ${error.message}`)
      }

      // Track completion
      await this.trackEvent(sessionId, 'form_submit', {
        business_name: formData.businessName,
        completion_time_seconds: completionTimeSeconds,
        total_steps: 12
      })

      return this.mapSubmissionFromDB(data)
    } catch (error) {
      console.error('Submit onboarding error:', error)
      throw error instanceof Error ? error : new Error('Failed to submit onboarding')
    }
  }

  // ===========================================================================
  // FILE UPLOAD MANAGEMENT
  // ===========================================================================

  /**
   * Record file upload in database
   */
  static async recordFileUpload(
    sessionId: string,
    fileType: 'logo' | 'photo',
    fileName: string,
    fileSize: number,
    mimeType: string,
    fileUrl: string,
    width?: number,
    height?: number
  ): Promise<UploadedFile> {
    try {
      const uploadData = {
        session_id: sessionId,
        file_type: fileType,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        file_url: fileUrl,
        width,
        height,
        upload_completed: true
      }

      const { data, error } = await supabase
        .from('onboarding_uploads')
        .insert(uploadData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to record file upload: ${error.message}`)
      }

      // Track file upload
      await this.trackEvent(sessionId, 'file_upload_success', {
        file_type: fileType,
        file_size: fileSize,
        mime_type: mimeType
      })

      return {
        id: data.id,
        fileName: data.file_name,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        url: data.file_url,
        width: data.width,
        height: data.height,
        uploadedAt: data.created_at
      }
    } catch (error) {
      console.error('Record file upload error:', error)
      throw error instanceof Error ? error : new Error('Failed to record file upload')
    }
  }

  /**
   * Get uploaded files for session
   */
  static async getUploadedFiles(
    sessionId: string,
    fileType?: 'logo' | 'photo'
  ): Promise<UploadedFile[]> {
    try {
      let query = supabase
        .from('onboarding_uploads')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })

      if (fileType) {
        query = query.eq('file_type', fileType)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`Failed to get uploaded files: ${error.message}`)
      }

      return data.map(file => ({
        id: file.id,
        fileName: file.file_name,
        fileSize: file.file_size,
        mimeType: file.mime_type,
        url: file.file_url,
        width: file.width,
        height: file.height,
        uploadedAt: file.created_at
      }))
    } catch (error) {
      console.error('Get uploaded files error:', error)
      throw error instanceof Error ? error : new Error('Failed to get uploaded files')
    }
  }

  // ===========================================================================
  // ANALYTICS & TRACKING
  // ===========================================================================

  /**
   * Track analytics event
   */
  static async trackEvent(
    sessionId: string,
    eventType: AnalyticsEventType,
    metadata: Record<string, any> = {},
    stepNumber?: number,
    fieldName?: string,
    category: AnalyticsCategory = 'user_action',
    durationMs?: number
  ): Promise<void> {
    try {
      const eventData = {
        session_id: sessionId,
        event_type: eventType,
        step_number: stepNumber,
        field_name: fieldName,
        metadata,
        category,
        duration_ms: durationMs
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
      console.error('Track event error:', error)
      // Don't throw - analytics failures shouldn't break user flow
    }
  }

  /**
   * Get analytics for session
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

      return data.map(this.mapAnalyticsFromDB)
    } catch (error) {
      console.error('Get session analytics error:', error)
      throw error instanceof Error ? error : new Error('Failed to get session analytics')
    }
  }

  // ===========================================================================
  // ADMIN FUNCTIONS (Service Role Only)
  // ===========================================================================

  /**
   * Get all submissions with filters
   */
  static async getSubmissions(filters: {
    status?: string
    dateFrom?: string
    dateTo?: string
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

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      query = query
        .order('created_at', { ascending: false })
        .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1)

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to get submissions: ${error.message}`)
      }

      return {
        submissions: data.map(this.mapSubmissionFromDB),
        total: count || 0
      }
    } catch (error) {
      console.error('Get submissions error:', error)
      throw error instanceof Error ? error : new Error('Failed to get submissions')
    }
  }

  /**
   * Update submission status
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
      console.error('Update submission status error:', error)
      throw error instanceof Error ? error : new Error('Failed to update submission status')
    }
  }

  // ===========================================================================
  // DATA MAPPING HELPERS
  // ===========================================================================

  private static mapSessionFromDB(data: any): OnboardingSession {
    return {
      id: data.id,
      email: data.email,
      currentStep: data.current_step,
      formData: data.form_data || {},
      lastActivity: data.last_activity,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      emailVerified: data.email_verified,
      verificationCode: data.verification_code,
      verificationAttempts: data.verification_attempts,
      verificationLockedUntil: data.verification_locked_until,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      locale: data.locale || 'en'
    }
  }

  private static mapSubmissionFromDB(data: any): OnboardingSubmission {
    return {
      id: data.id,
      sessionId: data.session_id,
      email: data.email,
      businessName: data.business_name,
      formData: data.form_data,
      previewSentAt: data.preview_sent_at,
      previewViewedAt: data.preview_viewed_at,
      paymentCompletedAt: data.payment_completed_at,
      completionTimeSeconds: data.completion_time_seconds,
      createdAt: data.created_at,
      adminNotes: data.admin_notes,
      status: data.status
    }
  }

  private static mapAnalyticsFromDB(data: any): AnalyticsEvent {
    return {
      id: data.id,
      sessionId: data.session_id,
      eventType: data.event_type,
      stepNumber: data.step_number,
      fieldName: data.field_name,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      category: data.category,
      durationMs: data.duration_ms,
      ipAddress: data.ip_address,
      userAgent: data.user_agent
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Initialize a new onboarding session
 */
export async function initializeOnboarding(
  email: string,
  name: string,
  locale: Locale = 'en'
): Promise<ApiResponse<OnboardingSession>> {
  try {
    const session = await OnboardingService.createSession(email, name, locale)
    return { success: true, data: session }
  } catch (error) {
    return { 
      success: false, 
      error: {
        message: error instanceof Error ? error.message : 'Failed to initialize onboarding',
        code: 'INIT_FAILED'
      }
    }
  }
}

/**
 * Continue existing onboarding session
 */
export async function continueOnboarding(sessionId: string): Promise<ApiResponse<OnboardingSession>> {
  try {
    const session = await OnboardingService.getSession(sessionId)
    if (!session) {
      return {
        success: false,
        error: { message: 'Session not found or expired', code: 'SESSION_NOT_FOUND' }
      }
    }
    return { success: true, data: session }
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to continue onboarding',
        code: 'CONTINUE_FAILED'
      }
    }
  }
}

/**
 * Submit completed onboarding form (convenience function)
 */
export async function submitOnboarding(
  sessionId: string,
  formData: OnboardingFormData,
  completionTimeSeconds?: number
): Promise<OnboardingSubmission> {
  return OnboardingService.submitOnboarding(sessionId, formData, completionTimeSeconds)
}