import { track } from '@vercel/analytics'
import {
  AnalyticsEventType,
  AnalyticsCategory,
  StepNumber,
  OnboardingFormData
} from '@/types/onboarding'

// =============================================================================
// ANALYTICS SERVICE CLASS
// =============================================================================

export class AnalyticsService {

  // ===========================================================================
  // HELPER FUNCTIONS
  // ===========================================================================

  /**
   * Track analytics event via API route (uses service role on server)
   */
  static async trackEventViaAPI(
    sessionId: string,
    eventType: AnalyticsEventType,
    metadata: Record<string, any> = {},
    stepNumber?: number,
    fieldName?: string,
    category: string = 'user_action',
    durationMs?: number
  ): Promise<void> {
    try {
      // Don't wait for analytics calls to complete - fire and forget
      fetch('/api/onboarding/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          eventType,
          metadata,
          stepNumber,
          fieldName,
          category,
          durationMs
        })
      }).catch(error => {
        // Silent fail for analytics - don't break user flow
        console.warn('Analytics tracking failed:', error)
      })
    } catch (error) {
      // Silent fail for analytics
      console.warn('Analytics tracking failed:', error)
    }
  }

  // ===========================================================================
  // PERFORMANCE TRACKING
  // ===========================================================================

  /**
   * Track page load performance
   */
  static trackPageLoad(
    sessionId: string,
    loadTime: number,
    stepNumber?: number
  ): void {
    // Track with Vercel Analytics
    track('onboarding_page_load', {
      step: stepNumber || 'initial',
      load_time_ms: loadTime,
      performance_grade: this.getPerformanceGrade(loadTime)
    })

    // Track in database for funnel analysis
    if (sessionId) {
      this.trackEventViaAPI(
        sessionId,
        'step_view',
        {
          load_time_ms: loadTime,
          performance_grade: this.getPerformanceGrade(loadTime)
        },
        stepNumber,
        undefined,
        'performance',
        loadTime
      )
    }
  }

  /**
   * Track step transition performance
   */
  static trackStepTransition(
    sessionId: string,
    fromStep: number,
    toStep: number,
    transitionTime: number
  ): void {
    const isBackward = toStep < fromStep
    
    // Track with Vercel Analytics
    track('onboarding_step_transition', {
      from_step: fromStep,
      to_step: toStep,
      transition_time_ms: transitionTime,
      direction: isBackward ? 'backward' : 'forward',
      performance_grade: this.getPerformanceGrade(transitionTime)
    })

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      isBackward ? 'navigation_back' : 'navigation_forward',
      {
        from_step: fromStep,
        to_step: toStep,
        transition_time_ms: transitionTime,
        direction: isBackward ? 'backward' : 'forward'
      },
      toStep,
      undefined,
      'performance',
      transitionTime
    )
  }

  // ===========================================================================
  // USER BEHAVIOR TRACKING
  // ===========================================================================

  /**
   * Track step completion
   */
  static trackStepComplete(
    sessionId: string,
    stepNumber: StepNumber,
    timeSpentSeconds: number,
    formData?: Partial<OnboardingFormData>
  ): void {
    const metadata = {
      time_spent_seconds: timeSpentSeconds,
      completion_rate_so_far: (stepNumber / 12) * 100,
      data_completeness: formData ? this.calculateDataCompleteness(formData, stepNumber) : 0
    }

    // Track with Vercel Analytics
    track('onboarding_step_completed', {
      step_number: stepNumber,
      ...metadata
    })

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'step_complete',
      metadata,
      stepNumber,
      undefined,
      'user_action',
      timeSpentSeconds * 1000
    )
  }

  /**
   * Track field interactions
   */
  static trackFieldInteraction(
    sessionId: string,
    stepNumber: StepNumber,
    fieldName: string,
    eventType: 'focus' | 'blur' | 'change',
    timeSpentMs?: number
  ): void {
    // Only track for significant interactions (not every keystroke)
    if (eventType === 'blur' && timeSpentMs && timeSpentMs > 1000) {
      this.trackEventViaAPI(
        sessionId,
        'field_blur',
        {
          time_spent_ms: timeSpentMs,
          field_interaction_depth: timeSpentMs > 10000 ? 'deep' : 'shallow'
        },
        stepNumber,
        fieldName,
        'user_action',
        timeSpentMs
      )
    }
  }

  /**
   * Track form errors
   */
  static trackFormError(
    sessionId: string,
    stepNumber: StepNumber,
    fieldName: string,
    errorMessage: string,
    errorCode?: string
  ): void {
    // Track with Vercel Analytics
    track('onboarding_form_error', {
      step_number: stepNumber,
      field_name: fieldName,
      error_code: errorCode || 'validation_error'
    })

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'field_error',
      {
        error_message: errorMessage,
        error_code: errorCode || 'validation_error',
        field_name: fieldName
      },
      stepNumber,
      fieldName,
      'error'
    )
  }

  /**
   * Track abandonment events
   */
  static trackAbandonment(
    sessionId: string,
    stepNumber: StepNumber,
    timeSpentTotal: number,
    reason?: 'session_timeout' | 'user_close' | 'navigation_away'
  ): void {
    const abandonmentData = {
      abandonment_step: stepNumber,
      time_spent_total_seconds: Math.floor(timeSpentTotal / 1000),
      completion_percentage: (stepNumber / 12) * 100,
      reason: reason || 'unknown'
    }

    // Track with Vercel Analytics
    track('onboarding_abandoned', abandonmentData)

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'session_abandon',
      abandonmentData,
      stepNumber,
      undefined,
      'user_action'
    )
  }

  // ===========================================================================
  // EMAIL & VERIFICATION TRACKING
  // ===========================================================================

  /**
   * Track email verification flow
   */
  static trackEmailVerification(
    sessionId: string,
    eventType: 'code_sent' | 'code_entered' | 'verification_success' | 'verification_failed' | 'max_attempts',
    metadata: Record<string, any> = {}
  ): void {
    const eventMapping: Record<string, AnalyticsEventType> = {
      code_sent: 'email_verification_sent',
      code_entered: 'email_verification_sent',
      verification_success: 'email_verification_success',
      verification_failed: 'email_verification_failed',
      max_attempts: 'email_verification_failed'
    }

    // Track with Vercel Analytics
    track('onboarding_email_verification', {
      event_type: eventType,
      ...metadata
    })

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      eventMapping[eventType] || 'email_verification_sent',
      metadata,
      2, // Email verification is step 2
      undefined,
      'user_action'
    )
  }

  // ===========================================================================
  // FILE UPLOAD TRACKING
  // ===========================================================================

  /**
   * Track file upload events
   */
  static trackFileUpload(
    sessionId: string,
    eventType: 'upload_start' | 'upload_success' | 'upload_error',
    fileType: 'logo' | 'photo',
    metadata: Record<string, any> = {}
  ): void {
    const eventMapping: Record<string, AnalyticsEventType> = {
      upload_start: 'file_upload_start',
      upload_success: 'file_upload_success',
      upload_error: 'file_upload_error'
    }

    // Track with Vercel Analytics
    track('onboarding_file_upload', {
      event_type: eventType,
      file_type: fileType,
      ...metadata
    })

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      eventMapping[eventType],
      { file_type: fileType, ...metadata },
      12, // File uploads are in step 12
      `${fileType}_upload`,
      eventType === 'upload_error' ? 'error' : 'user_action'
    )
  }

  // ===========================================================================
  // COMPLETION & CONVERSION TRACKING
  // ===========================================================================

  /**
   * Track onboarding completion
   */
  static trackOnboardingCompletion(
    sessionId: string,
    totalTimeMinutes: number,
    formData: OnboardingFormData
  ): void {
    const completionData = {
      total_time_minutes: totalTimeMinutes,
      business_industry: formData.industry,
      design_style: formData.designStyle,
      image_style: formData.imageStyle,
      color_palette_count: formData.colorPalette?.length || 0,
      color_palette_colors: formData.colorPalette?.join(',') || '',
      website_sections_count: formData.websiteSections.length,
      primary_goal: formData.primaryGoal,
      has_logo_upload: !!formData.logoUpload,
      has_business_photos: (formData.businessPhotos?.length || 0) > 0,
      ...(formData.offeringType && { offering_type: formData.offeringType }),
      locale: 'it' // Assume Italian for now
    }

    // Track with Vercel Analytics
    track('onboarding_completed', completionData)

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'form_submit',
      completionData,
      12,
      undefined,
      'user_action',
      totalTimeMinutes * 60 * 1000
    )
  }

  /**
   * Track conversion funnel metrics
   */
  static trackConversionFunnel(
    sessionId: string,
    currentStep: StepNumber,
    totalSessions: number
  ): void {
    const funnelData = {
      current_step: currentStep,
      step_completion_rate: (currentStep / 12) * 100,
      total_sessions_today: totalSessions
    }

    // Track with Vercel Analytics for funnel analysis
    track('onboarding_funnel_progress', funnelData)
  }

  // ===========================================================================
  // TECHNICAL PERFORMANCE TRACKING
  // ===========================================================================

  /**
   * Track API performance
   */
  static trackAPIPerformance(
    sessionId: string,
    operation: string,
    duration: number,
    success: boolean,
    errorCode?: string
  ): void {
    const performanceData = {
      operation,
      duration_ms: duration,
      success,
      ...(errorCode && { error_code: errorCode }),
      performance_grade: this.getPerformanceGrade(duration)
    }

    // Track with Vercel Analytics
    track('onboarding_api_performance', performanceData)

    // Track significant slow operations in database
    if (duration > 2000 || !success) {
      this.trackEventViaAPI(
        sessionId,
        success ? 'auto_save' : 'form_error',
        performanceData,
        undefined,
        undefined,
        success ? 'performance' : 'error',
        duration
      )
    }
  }

  /**
   * Track browser compatibility issues
   */
  static trackCompatibilityIssue(
    sessionId: string,
    issue: string,
    userAgent: string,
    metadata: Record<string, any> = {}
  ): void {
    const compatibilityData = {
      issue,
      user_agent: userAgent,
      ...metadata
    }

    // Track with Vercel Analytics
    track('onboarding_compatibility_issue', compatibilityData)

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'form_error',
      compatibilityData,
      undefined,
      undefined,
      'error'
    )
  }

  // ===========================================================================
  // SESSION & RECOVERY TRACKING
  // ===========================================================================

  /**
   * Track session recovery events
   */
  static trackSessionRecovery(
    sessionId: string,
    recoveryType: 'auto_recovery' | 'manual_recovery' | 'email_recovery',
    stepsRecovered: number,
    dataLoss: boolean
  ): void {
    const recoveryData = {
      recovery_type: recoveryType,
      steps_recovered: stepsRecovered,
      data_loss: dataLoss,
      recovery_success: stepsRecovered > 0
    }

    // Track with Vercel Analytics
    track('onboarding_session_recovery', recoveryData)

    // Track in database
    this.trackEventViaAPI(
      sessionId,
      'session_recovered',
      recoveryData,
      undefined,
      undefined,
      'system_event'
    )
  }

  /**
   * Track auto-save performance
   */
  static trackAutoSave(
    sessionId: string,
    stepNumber: StepNumber,
    saveTime: number,
    success: boolean,
    dataSize?: number
  ): void {
    const autoSaveData = {
      save_time_ms: saveTime,
      success,
      ...(dataSize !== undefined && { data_size_bytes: dataSize }),
      performance_grade: this.getPerformanceGrade(saveTime)
    }

    // Only track slow or failed saves
    if (saveTime > 1000 || !success) {
      track('onboarding_auto_save', {
        step_number: stepNumber,
        ...autoSaveData
      })

      this.trackEventViaAPI(
        sessionId,
        success ? 'auto_save' : 'form_error',
        autoSaveData,
        stepNumber,
        undefined,
        success ? 'performance' : 'error',
        saveTime
      )
    }
  }

  // ===========================================================================
  // UTILITY FUNCTIONS
  // ===========================================================================

  /**
   * Calculate data completeness percentage for a step
   */
  private static calculateDataCompleteness(
    formData: Partial<OnboardingFormData>,
    stepNumber: StepNumber
  ): number {
    const requiredFields = this.getRequiredFieldsForStep(stepNumber)
    const completedFields = requiredFields.filter(field => {
      const value = this.getNestedValue(formData, field)
      return value !== undefined && value !== null && value !== ''
    })

    return Math.round((completedFields.length / requiredFields.length) * 100)
  }

  /**
   * Get required fields for a specific step
   */
  private static getRequiredFieldsForStep(stepNumber: StepNumber): string[] {
    const fieldMap: Record<StepNumber, string[]> = {
      1: ['name', 'email'],
      2: ['emailVerified'],
      3: ['businessName', 'businessEmail', 'businessPhone', 'physicalAddress', 'industry'],
      4: ['offer', 'competitors', 'uniqueness'],
      5: ['customerProfile'],
      6: ['problemSolved', 'customerDelight'],
      7: ['websiteReferences'],
      8: ['designStyle'],
      9: ['imageStyle'],
      10: ['colorPalette'],
      11: ['websiteSections', 'primaryGoal'],
      12: [], // Optional uploads
      13: [], // Optional language add-ons
      14: ['acceptTerms'] // Payment completion
    }

    return fieldMap[stepNumber] || []
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Get performance grade based on timing
   */
  private static getPerformanceGrade(timeMs: number): 'excellent' | 'good' | 'poor' | 'critical' {
    if (timeMs < 500) return 'excellent'
    if (timeMs < 1500) return 'good'
    if (timeMs < 3000) return 'poor'
    return 'critical'
  }

  // ===========================================================================
  // BATCH TRACKING FOR PERFORMANCE
  // ===========================================================================

  private static eventQueue: Array<{
    sessionId: string
    eventType: AnalyticsEventType
    metadata: Record<string, any>
    stepNumber?: StepNumber
    timestamp: number
  }> = []

  /**
   * Queue event for batch processing
   */
  static queueEvent(
    sessionId: string,
    eventType: AnalyticsEventType,
    metadata: Record<string, any> = {},
    stepNumber?: StepNumber
  ): void {
    this.eventQueue.push({
      sessionId,
      eventType,
      metadata,
      stepNumber,
      timestamp: Date.now()
    })

    // Process queue when it gets large enough
    if (this.eventQueue.length >= 10) {
      this.flushEventQueue()
    }
  }

  /**
   * Flush queued events to database
   */
  static async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue.length = 0 // Clear queue

    try {
      // Process events in batches
      await Promise.all(
        events.map(event =>
          this.trackEventViaAPI(
            event.sessionId,
            event.eventType,
            { ...event.metadata, queued_at: event.timestamp },
            event.stepNumber
          )
        )
      )
    } catch (error) {
      console.error('Failed to flush event queue:', error)
      // Re-add events to queue for retry
      this.eventQueue.unshift(...events)
    }
  }

  /**
   * Set up automatic queue flushing
   */
  static initializeAutoFlush(): void {
    // Flush queue every 30 seconds
    setInterval(() => {
      this.flushEventQueue()
    }, 30000)

    // Flush queue on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEventQueue()
      })
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON TRACKING SCENARIOS
// =============================================================================

/**
 * Track when user starts onboarding
 */
export function trackOnboardingStart(sessionId: string): void {
  AnalyticsService.trackPageLoad(sessionId, performance.now(), 1)
  track('onboarding_started')
}

/**
 * Track when user navigates between steps
 */
export function trackStepNavigation(
  sessionId: string,
  fromStep: number,
  toStep: number
): void {
  const transitionTime = performance.now()
  AnalyticsService.trackStepTransition(sessionId, fromStep, toStep, transitionTime)
}

/**
 * Track form validation errors
 */
export function trackValidationError(
  sessionId: string,
  stepNumber: StepNumber,
  fieldName: string,
  errorMessage: string
): void {
  AnalyticsService.trackFormError(sessionId, stepNumber, fieldName, errorMessage)
}

/**
 * Track successful onboarding completion
 */
export function trackCompletionSuccess(
  sessionId: string,
  formData: OnboardingFormData,
  totalTimeMs: number
): void {
  const totalTimeMinutes = Math.round(totalTimeMs / 60000)
  AnalyticsService.trackOnboardingCompletion(sessionId, totalTimeMinutes, formData)
}

/**
 * Initialize analytics with auto-flush
 */
export function initializeAnalytics(): void {
  AnalyticsService.initializeAutoFlush()
}

// =============================================================================
// CONVERSION METRICS TRACKING FOR STEPS 13-14
// =============================================================================

/**
 * Track Step 13 completion with language add-ons
 * Target: ≥25% completion rate
 */
export function trackStep13Completion(
  sessionId: string,
  selectedLanguages: string[],
  timeSpentSeconds: number
): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  track('step_13_completed', {
    session_id: sessionId,
    languages_selected: selectedLanguages.length,
    languages: selectedLanguages.join(','),
    time_spent_seconds: timeSpentSeconds,
    is_mobile: isMobile,
    has_addons: selectedLanguages.length > 0
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'step_complete',
    {
      languages_selected: selectedLanguages.length,
      languages: selectedLanguages,
      time_spent_seconds: timeSpentSeconds,
      is_mobile: isMobile,
      has_addons: selectedLanguages.length > 0
    },
    13,
    undefined,
    'conversion'
  )
}

/**
 * Track Step 14 payment initiation
 * Target: ≥25% completion rate, ≤15min time-to-complete
 */
export function trackStep14PaymentInitiated(
  sessionId: string,
  totalAmount: number,
  languageCount: number,
  discountApplied: boolean
): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  track('step_14_payment_initiated', {
    session_id: sessionId,
    total_amount: totalAmount,
    language_count: languageCount,
    discount_applied: discountApplied,
    is_mobile: isMobile
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'payment_initiated',
    {
      total_amount: totalAmount,
      language_count: languageCount,
      discount_applied: discountApplied,
      is_mobile: isMobile
    },
    14,
    undefined,
    'conversion'
  )
}

/**
 * Track Step 14 payment completion
 * Target: ≥40% mobile completion rate
 */
export function trackStep14PaymentCompleted(
  sessionId: string,
  totalAmount: number,
  languageCount: number,
  timeToCompleteMinutes: number
): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const meetsTimeTarget = timeToCompleteMinutes <= 15

  track('step_14_payment_completed', {
    session_id: sessionId,
    total_amount: totalAmount,
    language_count: languageCount,
    time_to_complete_minutes: timeToCompleteMinutes,
    is_mobile: isMobile,
    meets_time_target: meetsTimeTarget
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'payment_completed',
    {
      total_amount: totalAmount,
      language_count: languageCount,
      time_to_complete_minutes: timeToCompleteMinutes,
      is_mobile: isMobile,
      meets_time_target: meetsTimeTarget
    },
    14,
    undefined,
    'conversion'
  )
}

/**
 * Track Step 14 payment failure
 * For drop-off analysis
 */
export function trackStep14PaymentFailed(
  sessionId: string,
  errorCode: string,
  errorMessage: string
): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  track('step_14_payment_failed', {
    session_id: sessionId,
    error_code: errorCode,
    error_message: errorMessage,
    is_mobile: isMobile
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'payment_failed',
    {
      error_code: errorCode,
      error_message: errorMessage,
      is_mobile: isMobile
    },
    14,
    undefined,
    'error'
  )
}

/**
 * Track drop-off at specific step
 * For analyzing where users abandon the flow
 */
export function trackDropOff(
  sessionId: string,
  stepNumber: number,
  reason?: string
): void {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  track('onboarding_drop_off', {
    session_id: sessionId,
    step_number: stepNumber,
    reason: reason || 'unknown',
    is_mobile: isMobile
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'drop_off',
    {
      reason: reason || 'unknown',
      is_mobile: isMobile
    },
    stepNumber,
    undefined,
    'conversion'
  )
}

/**
 * Calculate and track conversion rate for Steps 13-14
 * Call this periodically to monitor performance
 */
export async function calculateConversionMetrics(): Promise<{
  step13CompletionRate: number
  step14CompletionRate: number
  avgTimeToComplete: number
  mobileCompletionRate: number
  dropOffRate: number
}> {
  try {
    const response = await fetch('/api/onboarding/analytics/conversion-metrics')
    if (!response.ok) throw new Error('Failed to fetch conversion metrics')

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to calculate conversion metrics:', error)
    return {
      step13CompletionRate: 0,
      step14CompletionRate: 0,
      avgTimeToComplete: 0,
      mobileCompletionRate: 0,
      dropOffRate: 0
    }
  }
}

// =============================================================================
// PERFORMANCE MONITORING FOR STEPS 13-14
// =============================================================================

/**
 * Track Step 13 load performance
 * Target: Component interactive in <300ms
 */
export function trackStep13Performance(
  sessionId: string,
  loadTimeMs: number,
  languageCount: number
): void {
  const performanceGrade = loadTimeMs < 300 ? 'excellent' : loadTimeMs < 500 ? 'good' : 'poor'

  track('step_13_performance', {
    session_id: sessionId,
    load_time_ms: loadTimeMs,
    language_count: languageCount,
    performance_grade: performanceGrade,
    meets_target: loadTimeMs < 300
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'step_view',
    {
      load_time_ms: loadTimeMs,
      language_count: languageCount,
      performance_grade: performanceGrade,
      meets_target: loadTimeMs < 300
    },
    13,
    undefined,
    'performance',
    loadTimeMs
  )
}

/**
 * Track Step 13 price calculation performance
 * Target: Updates <200ms
 */
export function trackStep13PriceCalculation(
  sessionId: string,
  calculationTimeMs: number,
  languageCount: number
): void {
  const performanceGrade = calculationTimeMs < 200 ? 'excellent' : calculationTimeMs < 500 ? 'good' : 'poor'

  if (calculationTimeMs > 200) {
    track('step_13_price_calculation_slow', {
      session_id: sessionId,
      calculation_time_ms: calculationTimeMs,
      language_count: languageCount,
      performance_grade: performanceGrade
    })

    AnalyticsService.trackEventViaAPI(
      sessionId,
      'performance_warning',
      {
        component: 'price_calculation',
        calculation_time_ms: calculationTimeMs,
        language_count: languageCount,
        performance_grade: performanceGrade
      },
      13,
      undefined,
      'performance',
      calculationTimeMs
    )
  }
}

/**
 * Track Step 14 load performance
 * Target: Stripe Elements loaded and interactive in <1.5s
 */
export function trackStep14Performance(
  sessionId: string,
  loadTimeMs: number,
  stripeElementsLoadTimeMs: number
): void {
  const totalLoadTime = loadTimeMs + stripeElementsLoadTimeMs
  const performanceGrade = totalLoadTime < 1500 ? 'excellent' : totalLoadTime < 3000 ? 'good' : 'poor'

  track('step_14_performance', {
    session_id: sessionId,
    load_time_ms: loadTimeMs,
    stripe_elements_load_time_ms: stripeElementsLoadTimeMs,
    total_load_time_ms: totalLoadTime,
    performance_grade: performanceGrade,
    meets_target: totalLoadTime < 1500
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'step_view',
    {
      load_time_ms: loadTimeMs,
      stripe_elements_load_time_ms: stripeElementsLoadTimeMs,
      total_load_time_ms: totalLoadTime,
      performance_grade: performanceGrade,
      meets_target: totalLoadTime < 1500
    },
    14,
    undefined,
    'performance',
    totalLoadTime
  )
}

/**
 * Track Stripe checkout session creation performance
 * Target: Session created in <1.5s
 */
export function trackStripeSessionCreation(
  sessionId: string,
  creationTimeMs: number,
  success: boolean
): void {
  const performanceGrade = creationTimeMs < 1500 ? 'excellent' : creationTimeMs < 3000 ? 'good' : 'poor'

  track('stripe_session_creation', {
    session_id: sessionId,
    creation_time_ms: creationTimeMs,
    performance_grade: performanceGrade,
    success: success,
    meets_target: creationTimeMs < 1500
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    success ? 'stripe_session_created' : 'stripe_session_failed',
    {
      creation_time_ms: creationTimeMs,
      performance_grade: performanceGrade,
      meets_target: creationTimeMs < 1500
    },
    14,
    undefined,
    'performance',
    creationTimeMs
  )
}

/**
 * Track payment processing performance
 * Target: Payment confirmed in <5s (excluding 3DS)
 */
export function trackPaymentProcessing(
  sessionId: string,
  processingTimeMs: number,
  required3DS: boolean
): void {
  const targetTime = required3DS ? 10000 : 5000
  const performanceGrade = processingTimeMs < targetTime ? 'excellent' : processingTimeMs < targetTime * 2 ? 'good' : 'poor'

  track('payment_processing', {
    session_id: sessionId,
    processing_time_ms: processingTimeMs,
    required_3ds: required3DS,
    performance_grade: performanceGrade,
    meets_target: processingTimeMs < targetTime
  })

  AnalyticsService.trackEventViaAPI(
    sessionId,
    'payment_processing',
    {
      processing_time_ms: processingTimeMs,
      required_3ds: required3DS,
      performance_grade: performanceGrade,
      meets_target: processingTimeMs < targetTime
    },
    14,
    undefined,
    'performance',
    processingTimeMs
  )
}

// Export the main service
export default AnalyticsService