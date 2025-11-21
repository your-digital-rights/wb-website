// WhiteBoar Onboarding System - Core Type Definitions

// =============================================================================
// FORM DATA TYPES - Represents the complete onboarding form structure
// =============================================================================

export interface OnboardingFormData {
  // Step 1: Welcome & Basic Info
  firstName: string
  lastName: string
  email: string
  
  // Step 2: Email Verification (handled separately)
  emailVerified: boolean
  
  // Step 3: Business Basics
  businessName: string
  businessEmail: string
  businessPhone: string
  businessStreet: string
  businessCity: string
  businessProvince: string
  businessPostalCode: string
  businessCountry: string
  businessPlaceId?: string // Google Places ID
  industry: string
  customIndustry?: string // Temporary field when "Other" is selected
  vatNumber?: string

  // Legacy compatibility - will be transformed to flat fields
  physicalAddress?: {
    street: string
    city: string
    province: string
    postalCode: string
    country: string
    placeId?: string
  }
  
  // Step 4: Brand Definition
  businessDescription: string
  competitorUrls?: string[] // URLs to competitor websites (max 3)
  competitorAnalysis?: string
  
  // Step 5: Customer Profile (5 sliders, 0-100 scale)
  customerProfile: {
    budget: number // Budget-Conscious (0) ↔ Premium (100)
    style: number // Traditional (0) ↔ Modern (100)
    motivation: number // Practical Solutions (0) ↔ Experience (100)
    decisionMaking: number // Spontaneous (0) ↔ Researches Thoroughly (100)
    loyalty: number // Price-Driven (0) ↔ Brand-Loyal (100)
  }
  
  // Step 6: Customer Needs
  customerProblems: string
  customerDelight: string
  
  // Step 7: Visual Inspiration
  websiteReferences: string[] // URLs (2-3)
  
  // Step 8: Design Style Selection
  designStyle: DesignStyleOption
  
  // Step 9: Image Style Selection
  imageStyle: ImageStyleOption
  
  // Step 10: Color Palette - Array of hex color values [background, primary, secondary, accent, ...additional]
  // Order matches color_palettes.json: index 0=background, 1=primary, 2=secondary, 3=accent, 4+=additional
  colorPalette?: string[] // Optional array of hex color values
  
  // Step 11: Website Structure
  websiteSections: WebsiteSection[]
  primaryGoal: PrimaryGoal
  offeringType?: 'products' | 'services' | 'both' // Conditional on sections
  offerings?: string[] // Dynamic list (1-6 items)
  
  // Step 12: Business Assets
  logoUpload?: UploadedFile
  businessPhotos?: UploadedFile[]

  // Step 13: Language Add-ons
  additionalLanguages?: string[]

  // Step 14: Payment
  discountCode?: string
  acceptTerms?: boolean

  // Completion (metadata)
  completedAt?: string
  totalTimeSeconds?: number
}

// =============================================================================
// STEP-SPECIFIC TYPES
// =============================================================================

export type DesignStyleOption = 
  | 'minimalist'
  | 'corporate' 
  | 'playful'
  | 'bold'
  | 'editorial'
  | 'retro'

export type ImageStyleOption =
  | 'photorealistic'
  | 'flat-illustration'
  | 'line-art'
  | 'sketch'
  | 'collage'
  | '3d'

// @deprecated - No longer used. Keeping for backward compatibility.
// Color palette is now stored as array of hex values in OnboardingFormData.colorPalette
export type ColorPaletteOption =
  | 'palette-1'
  | 'palette-2'
  | 'palette-3'
  | 'palette-4'
  | 'palette-5'
  | 'palette-6'

export type WebsiteSection = 
  | 'about-us'
  | 'products-services'
  | 'testimonials'
  | 'gallery'
  | 'events'
  | 'contact'
  | 'blog-news'

export type PrimaryGoal = 
  | 'call-book'
  | 'contact-form'
  | 'visit-location'
  | 'purchase'
  | 'download'
  | 'other'

export interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  width?: number
  height?: number
  uploadedAt: string
}

// =============================================================================
// SESSION MANAGEMENT TYPES
// =============================================================================

export interface OnboardingSession {
  id: string
  email: string
  currentStep: number
  formData: Partial<OnboardingFormData>
  lastActivity: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  verificationCode?: string
  verificationAttempts: number
  verificationLockedUntil?: string
  ipAddress?: string
  userAgent?: string
  locale: 'en' | 'it'
}

export interface OnboardingSubmission {
  id: string
  sessionId?: string
  email: string
  businessName: string
  formData: OnboardingFormData
  previewSentAt?: string
  previewViewedAt?: string
  paymentCompletedAt?: string
  completionTimeSeconds?: number
  createdAt: string
  adminNotes?: string
  status: SubmissionStatus
}

export type SubmissionStatus = 
  | 'submitted'
  | 'preview_sent'
  | 'paid'
  | 'completed'
  | 'cancelled'

// =============================================================================
// ANALYTICS & TRACKING TYPES
// =============================================================================

export interface AnalyticsEvent {
  id: string
  sessionId?: string
  eventType: AnalyticsEventType
  stepNumber?: number
  fieldName?: string
  metadata: Record<string, any>
  createdAt: string
  category: AnalyticsCategory
  durationMs?: number
  ipAddress?: string
  userAgent?: string
}

export type AnalyticsEventType =
  | 'step_view'
  | 'step_complete'
  | 'field_error'
  | 'field_blur'
  | 'field_focus'
  | 'form_submit'
  | 'form_error'
  | 'session_start'
  | 'session_abandon'
  | 'email_verification_sent'
  | 'email_verification_success'
  | 'email_verification_failed'
  | 'file_upload_start'
  | 'file_upload_success'
  | 'file_upload_error'
  | 'navigation_back'
  | 'navigation_forward'
  | 'auto_save'
  | 'manual_save'
  | 'session_expired'
  | 'session_recovered'
  | 'payment_initiated'
  | 'payment_completed'
  | 'payment_failed'
  | 'payment_processing'
  | 'drop_off'
  | 'performance_warning'
  | 'stripe_session_created'
  | 'stripe_session_failed'

export type AnalyticsCategory = 
  | 'user_action'
  | 'system_event'
  | 'error'
  | 'performance'

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface StepValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings?: ValidationError[]
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    details?: any
  }
}

export interface SessionResponse extends ApiResponse<OnboardingSession> {}
export interface SubmissionResponse extends ApiResponse<OnboardingSubmission> {}

export interface EmailVerificationResponse extends ApiResponse<{
  sent: boolean
  attemptsRemaining: number
  lockedUntil?: string
}> {}

export interface FileUploadResponse extends ApiResponse<{
  fileId: string
  url: string
  fileName: string
  fileSize: number
}> {}

// =============================================================================
// STORE TYPES (Zustand)
// =============================================================================

export interface OnboardingStore {
  // State
  sessionId: string | null
  currentStep: number
  formData: Partial<OnboardingFormData>
  completedSteps: number[]
  lastSaved: Date | null
  isLoading: boolean
  error: string | null
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  
  // Validation state
  stepErrors: Record<number, ValidationError[]>
  isDirty: boolean
  
  // Session management
  isSessionExpired: boolean
  sessionExpiresAt: string | null
  
  // Actions
  initSession: (sessionId: string) => Promise<void>
  updateFormData: (stepData: Partial<OnboardingFormData>) => void
  setCurrentStep: (step: number) => void
  markStepComplete: (step: number) => void
  nextStep: () => void
  previousStep: () => void
  saveProgress: () => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  clearSession: () => void
  
  // Validation actions
  validateStep: (step: number) => Promise<StepValidationResult>
  setStepErrors: (step: number, errors: ValidationError[]) => void
  clearErrors: () => void
  
  // Session recovery
  recoverSession: () => Promise<boolean>
  refreshSession: () => Promise<void>
  checkSessionExpired: () => void

  // Email verification (Step 2)
  verifyEmail: (email: string, code: string) => Promise<boolean>
  resendVerificationCode: (email: string, locale?: 'en' | 'it') => Promise<void>

  // Session helper functions for components
  initializeSession: (locale?: 'en' | 'it') => Promise<OnboardingSession>
  loadExistingSession: () => {
    id: string
    currentStep: number
    formData: Partial<OnboardingFormData>
    completedSteps: number[]
    expiresAt: string | null
    lastSaved: Date | null
  } | null
  hasExistingSession: () => boolean
  updateCurrentStep: (stepNumber: number) => void
}

// =============================================================================
// COMPONENT PROPS TYPES
// =============================================================================

export interface StepProps {
  stepNumber: number
  title: string
  subtitle?: string
  onNext: (data: any) => void
  onBack: () => void
  isLoading?: boolean
}

export interface FormFieldProps {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  helpText?: string
  error?: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface StepConfig {
  number: StepNumber
  title: string
  subtitle?: string
  component: React.ComponentType<StepProps>
  validation?: any // Zod schema
  isSkippable?: boolean
  estimatedTime: number // in seconds
}

// Helper type for form data at specific steps
export type FormDataAtStep<T extends StepNumber> =
  T extends 1 ? Pick<OnboardingFormData, 'firstName' | 'lastName' | 'email'> :
  T extends 2 ? Pick<OnboardingFormData, 'emailVerified'> :
  T extends 3 ? Pick<OnboardingFormData, 'businessName' | 'businessEmail' | 'businessPhone' | 'businessStreet' | 'businessCity' | 'businessProvince' | 'businessPostalCode' | 'businessCountry' | 'businessPlaceId' | 'industry' | 'vatNumber'> :
  T extends 4 ? Pick<OnboardingFormData, 'businessDescription' | 'competitorUrls' | 'competitorAnalysis'> :
  T extends 5 ? Pick<OnboardingFormData, 'customerProfile'> :
  T extends 6 ? Pick<OnboardingFormData, 'customerProblems' | 'customerDelight'> :
  T extends 7 ? Pick<OnboardingFormData, 'websiteReferences'> :
  T extends 8 ? Pick<OnboardingFormData, 'designStyle'> :
  T extends 9 ? Pick<OnboardingFormData, 'imageStyle'> :
  T extends 10 ? Pick<OnboardingFormData, 'colorPalette'> :
  T extends 11 ? Pick<OnboardingFormData, 'websiteSections' | 'primaryGoal' | 'offeringType' | 'offerings'> :
  T extends 12 ? Pick<OnboardingFormData, 'logoUpload' | 'businessPhotos'> :
  T extends 13 ? { additionalLanguages: string[] } :
  T extends 14 ? { discountCode?: string; acceptTerms: boolean } :
  never

// =============================================================================
// PAYMENT TYPES - For Steps 13 & 14
// =============================================================================

/**
 * Payment details stored in onboarding_submissions
 * Feature: 001-two-new-steps
 */
export interface PaymentDetails {
  stripe_payment_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  stripe_subscription_schedule_id: string // Schedule enforcing 12-month commitment
  payment_amount: number // in cents
  currency: string // always 'EUR'
  discount_code?: string
  discount_amount?: number // in cents
  payment_method: string // 'card', 'sepa_debit', etc.
  payment_status: 'succeeded' | 'pending' | 'failed'
  payment_completed_at?: string // ISO timestamp
  refunded_at?: string // ISO timestamp
  payment_metadata?: Record<string, any> // Additional Stripe metadata
}

/**
 * Stripe Checkout Session data for Step 14
 * Feature: 001-two-new-steps
 */
export interface CheckoutSession {
  clientSecret: string // Stripe client secret for Stripe Elements
  subscriptionId: string // Stripe subscription ID
  subscriptionScheduleId: string // Stripe subscription schedule ID (12-month commitment)
  customerId: string // Stripe customer ID
  totalAmount: number // Total amount in cents (after discount)
  currency: string // Always 'EUR'
  lineItems: CheckoutLineItem[]
  discountApplied?: {
    code: string
    amount: number // in cents
    percentage?: number
  }
}

/**
 * Individual line item in checkout
 */
export interface CheckoutLineItem {
  description: string
  amount: number // in cents
  quantity: number
  type: 'subscription' | 'one_time'
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const TOTAL_STEPS = 14 as const // Updated from 12 to 14
export const VERIFICATION_CODE_LENGTH = 6 as const
export const MAX_VERIFICATION_ATTEMPTS = 5 as const
export const VERIFICATION_LOCKOUT_MINUTES = 15 as const
export const SESSION_DURATION_DAYS = 7 as const

// Payment constants
export const BASE_PACKAGE_PRICE = 35 // €35/month
export const LANGUAGE_ADDON_PRICE = 75 // €75 one-time per language
export const MAX_PAYMENT_ATTEMPTS = 5
export const PAYMENT_ATTEMPT_WINDOW_HOURS = 1