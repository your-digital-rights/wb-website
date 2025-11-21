'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { useOnboardingStore } from '@/stores/onboarding'
import { StepTemplate } from '@/components/onboarding/StepTemplate'
import { getStepComponent } from '@/components/onboarding/steps'
import { getStepSchema, type StepFormData } from '@/schemas/onboarding'
import { submitOnboarding } from '@/services/onboarding-client'
import { getNextStep, getPreviousStep, calculateProgress } from '@/lib/step-navigation'
import { OnboardingFormData, StepNumber } from '@/types/onboarding'

// Tell Next.js this is a fully dynamic route (no static generation)
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default function OnboardingStep() {
  const router = useRouter()
  const params = useParams<{ stepNumber?: string; locale?: string }>()
  const t = useTranslations('onboarding.steps')

  const stepNumber = parseInt(params?.stepNumber ?? '1', 10)
  const locale = (params?.locale ?? 'en') as string
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const {
    currentStep,
    formData,
    updateFormData,
    nextStep,
    validateStep,
    isSessionExpired,
    sessionId,
    initializeSession,
    hasExistingSession
  } = useOnboardingStore()

  // Initialize session if none exists or load existing session from URL
  // ARCHITECTURE NOTE: Session persistence uses localStorage-first approach
  // - Primary: Session data persisted in localStorage via Zustand
  // - Fallback: URL ?sessionId=xxx parameter (for recovery emails, cross-device, bookmarks)
  // - URL parameters take priority when present to support session recovery
  useEffect(() => {
    const initSession = async () => {
      // Check for session ID in URL params first (recovery email, bookmark, cross-device)
      const urlSessionId = new URLSearchParams(window.location.search).get('sessionId')

      if (urlSessionId && urlSessionId !== sessionId) {
        try {
          setIsLoading(true)
          // Load existing session from URL
          const { initSession: loadExistingSession } = useOnboardingStore.getState()
          await loadExistingSession(urlSessionId)
        } catch (error) {
          console.error('Failed to load session from URL:', error)
          // If loading session fails, create a new one
          await initializeSession(locale as 'en' | 'it')
        } finally {
          setIsLoading(false)
        }
      } else if (!hasExistingSession() && !sessionId) {
        try {
          setIsLoading(true)
          await initializeSession(locale as 'en' | 'it')
        } catch (error) {
          console.error('Failed to initialize session:', error)
          setError('Failed to initialize session. Please try again.')
        } finally {
          setIsLoading(false)
        }
      }

      // If we have a session but current step is behind the step number,
      // update current step to allow access to this step
      else if (sessionId && currentStep < stepNumber && stepNumber <= 14) {
        // This handles cases where user bookmarked a step or has progressed beyond the stored current step
        const { updateCurrentStep } = useOnboardingStore.getState()
        updateCurrentStep(stepNumber)
      }
    }

    initSession()
  }, [hasExistingSession, sessionId, initializeSession, locale, currentStep, stepNumber])

  // Redirect if trying to access a step too far ahead (only if session is loaded)
  useEffect(() => {
    // Only redirect if we have a valid session and user is trying to skip ahead
    if (sessionId && currentStep > 0 && stepNumber > currentStep + 1) {
      router.push(`/${locale}/onboarding/step/${currentStep}`)
    }
  }, [stepNumber, currentStep, router, sessionId, locale])

  // Track if we're currently resetting form from store to prevent auto-save loop
  const isResettingRef = useRef(false)

  // Get step schema and form setup - must be called before any early returns
  const schema = getStepSchema(stepNumber)

  // Extract default values for current step from store
  const getStepDefaultValues = useCallback((step: number) => {
    switch (step) {
      case 1:
        return {
          firstName: formData?.firstName ?? '',
          lastName: formData?.lastName ?? '',
          email: formData?.email ?? ''
        }
      case 2:
        return {
          emailVerified: formData?.emailVerified ?? false
        }
      case 3:
        return {
          businessName: formData?.businessName ?? '',
          businessEmail: formData?.businessEmail ?? '',
          businessPhone: formData?.businessPhone ?? '',
          businessStreet: formData?.businessStreet ?? formData?.physicalAddress?.street ?? '',
          businessCity: formData?.businessCity ?? formData?.physicalAddress?.city ?? '',
          businessProvince: formData?.businessProvince ?? formData?.physicalAddress?.province ?? '',
          businessPostalCode: formData?.businessPostalCode ?? formData?.physicalAddress?.postalCode ?? '',
          businessCountry: formData?.businessCountry ?? formData?.physicalAddress?.country ?? 'Italy',
          businessPlaceId: formData?.businessPlaceId ?? formData?.physicalAddress?.placeId ?? '',
          industry: formData?.industry ?? '',
          vatNumber: formData?.vatNumber ?? ''
        }
      case 4:
        return {
          businessDescription: formData?.businessDescription || '',
          competitorUrls: formData?.competitorUrls || [],
          competitorAnalysis: formData?.competitorAnalysis || ''
        }
      case 5:
        return {
          customerProfile: formData?.customerProfile ? {
            budget: formData.customerProfile.budget !== undefined ? formData.customerProfile.budget : 50,
            style: formData.customerProfile.style !== undefined ? formData.customerProfile.style : 50,
            motivation: formData.customerProfile.motivation !== undefined ? formData.customerProfile.motivation : 50,
            decisionMaking: formData.customerProfile.decisionMaking !== undefined ? formData.customerProfile.decisionMaking : 50,
            loyalty: formData.customerProfile.loyalty !== undefined ? formData.customerProfile.loyalty : 50
          } : {
            budget: 50,
            style: 50,
            motivation: 50,
            decisionMaking: 50,
            loyalty: 50
          }
        }
      case 6:
        return {
          customerProblems: formData?.customerProblems || '',
          customerDelight: formData?.customerDelight || ''
        }
      case 7:
        return {
          websiteReferences: formData?.websiteReferences || []
        }
      case 8:
        return {
          designStyle: formData?.designStyle || ''
        }
      case 9:
        return {
          imageStyle: formData?.imageStyle || ''
        }
      case 10:
        return {
          colorPalette: formData?.colorPalette || ''
        }
      case 11:
        return {
          websiteSections: formData?.websiteSections || [],
          primaryGoal: formData?.primaryGoal || '',
          offeringType: formData?.offeringType || undefined,
          products: formData?.products || []
        }
      case 12:
        // CRITICAL FIX: Don't include logoUpload/businessPhotos if undefined or empty
        // This allows keepDefaultValues to preserve existing form values
        const step12Values: any = {}
        if (formData?.logoUpload !== undefined && formData.logoUpload !== null) {
          step12Values.logoUpload = formData.logoUpload
        }
        // CRITICAL: Treat empty array same as undefined - don't include in reset values
        // This allows keepDefaultValues to preserve existing form data
        if (formData?.businessPhotos !== undefined && Array.isArray(formData.businessPhotos) && formData.businessPhotos.length > 0) {
          step12Values.businessPhotos = formData.businessPhotos
        }
        return step12Values
      case 13:
        return {
          additionalLanguages: formData?.additionalLanguages || []
        }
      case 14:
        return {
          discountCode: formData?.discountCode || '',
          acceptTerms: formData?.acceptTerms || false,
          additionalLanguages: formData?.additionalLanguages || []
        }
      default:
        return {}
    }
  }, [formData])

  const form = useForm<any>({
    resolver: schema ? zodResolver(schema) : undefined,
    defaultValues: getStepDefaultValues(stepNumber),
    mode: 'onChange'
  })

  const { handleSubmit, formState: { errors, isValid, isDirty }, watch } = form

  // Manual validation for Step 3 and Step 6 to fix isValid timing issues
  const watchedValues = watch()
  const isStep3Valid = stepNumber === 3 ?
    !!(watchedValues?.businessName &&
       watchedValues?.industry &&
       watchedValues?.businessPhone &&
       watchedValues?.businessEmail &&
       watchedValues?.businessStreet &&
       watchedValues?.businessCity &&
       watchedValues?.businessPostalCode &&
       watchedValues?.businessProvince) : isValid
       // Note: businessCountry is always 'Italy' (disabled field) so not checked here

  const isStep6Valid = stepNumber === 6 ?
    !!(watchedValues?.customerProblems &&
       watchedValues?.customerProblems.length >= 30) : isValid

  // Step 11: Products are optional, so step is always valid
  const isStep11Valid = stepNumber === 11 ? true : isValid

  // Step 12: Check if any files are uploading
  const isStep12Valid = stepNumber === 12 ?
    !watchedValues?._uploading : true

  // Reset form values when formData changes (e.g., loaded from localStorage)
  useEffect(() => {
    isResettingRef.current = true
    const currentValues = getStepDefaultValues(stepNumber)
    // Use keepDefaultValues to preserve other form fields not in currentValues
    form.reset(currentValues, { keepDefaultValues: true })
    // Use setTimeout to ensure the reset completes before allowing auto-save
    setTimeout(() => {
      isResettingRef.current = false
    }, 0)
  }, [formData, stepNumber, form, getStepDefaultValues])

  // Auto-save functionality
  useEffect(() => {
    const subscription = form.watch((data) => {
      // Skip auto-save for Step 13 (Language Add-ons) - save only on Next button click
      // This prevents unnecessary network requests during language selection
      if (stepNumber === 13) return

      // Save if form is dirty OR if we're not currently resetting (to catch programmatic changes like file uploads)
      if (!isResettingRef.current && data && (isDirty || (data as any).logoUpload || (data as any).businessPhotos)) {
        // CRITICAL FIX: Filter out undefined values AND empty arrays to prevent overwriting existing data
        // Only include fields that have actual values (not undefined or empty arrays)
        const cleanedData = Object.fromEntries(
          Object.entries(data).filter(([key, value]) => {
            if (value === undefined) return false
            // Special handling for array fields - don't save empty arrays
            if (key === 'businessPhotos' && Array.isArray(value) && value.length === 0) return false
            return true
          })
        )
        updateFormData(cleanedData as any)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, updateFormData, isDirty, stepNumber])

  // Validate step number (Step 14 is now the final step)
  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 14) {
    router.push(`/${locale}/onboarding`)
    return null
  }

  // Validate schema exists
  if (!schema) {
    router.push(`/${locale}/onboarding`)
    return null
  }

  // Handle next step
  const handleNext = async (data: StepFormData) => {
    setIsLoading(true)
    setError('')

    try {
      // First, trigger validation for all fields in the current form
      const isFormValid = await form.trigger()

      if (!isFormValid) {
        // Get all field errors and show first error message
        const errors = form.formState.errors
        let errorMessage = t('validationError') || 'Please fix the errors below'

        // Helper function to extract error message from nested errors
        const getErrorMessage = (errorObj: any): string | null => {
          if (typeof errorObj === 'string') return errorObj
          if (errorObj?.message) return errorObj.message
          if (typeof errorObj === 'object') {
            for (const key in errorObj) {
              const nestedError = getErrorMessage(errorObj[key])
              if (nestedError) return nestedError
            }
          }
          return null
        }

        // Find the first error message
        for (const [, error] of Object.entries(errors)) {
          const message = getErrorMessage(error)
          if (message) {
            errorMessage = message
            break
          }
        }

        setError(errorMessage)
        setIsLoading(false)
        return
      }

      // Update form data
      // Special handling for Step 3: ensure businessCountry is always set to 'Italy'
      const dataToSave = stepNumber === 3
        ? { ...data, businessCountry: 'Italy' }
        : data
      updateFormData(dataToSave as any)

      // Validate current step
      const isStepValid = await validateStep(stepNumber)
      if (!isStepValid) {
        setError(t('validationError'))
        return
      }

      // For Step 14 (final step), validate all previous steps using schemas
      if (stepNumber === 14) {
        const allFormData = { ...formData, ...data } as OnboardingFormData
        const failedSteps: { step: number; title: string; errors: string[] }[] = []

        // Validate each step systematically using their schemas
        const stepValidations = [
          { step: 1, title: 'Personal Information', requiredFields: ['firstName', 'lastName', 'email'] },
          { step: 2, title: 'Email Verification', requiredFields: ['emailVerified'] },
          {
            step: 3,
            title: 'Business Details',
            requiredFields: [
              'businessName', 'businessEmail', 'businessPhone', 'industry',
              'businessStreet', 'businessCity', 'businessPostalCode',
              'businessProvince', 'businessCountry'
            ]
          },
          { step: 4, title: 'Brand Definition', requiredFields: ['businessDescription'] },
          { step: 5, title: 'Customer Profile', requiredFields: ['customerProfile'] },
          { step: 6, title: 'Customer Needs', requiredFields: ['customerProblems'] },
          { step: 7, title: 'Visual Inspiration', requiredFields: [] },
          { step: 8, title: 'Design Style', requiredFields: ['designStyle'] },
          { step: 9, title: 'Image Style', requiredFields: ['imageStyle'] },
          { step: 10, title: 'Color Palette', requiredFields: ['colorPalette'] },
          { step: 11, title: 'Products & Services', requiredFields: [] } // Products are optional
        ]

        // Check each step
        for (const validation of stepValidations) {
          const stepErrors: string[] = []

          for (const field of validation.requiredFields) {
            const fieldValue = field.includes('.')
              ? field.split('.').reduce((obj, key) => obj?.[key], allFormData as any)
              : (allFormData as any)[field]

            if (fieldValue === undefined || fieldValue === null || fieldValue === '' ||
                (Array.isArray(fieldValue) && fieldValue.length === 0) ||
                (field === 'emailVerified' && !fieldValue) ||
                (field === 'businessDescription' && fieldValue.length < 50)) {
              stepErrors.push(field)
            }
          }

          if (stepErrors.length > 0) {
            failedSteps.push({
              step: validation.step,
              title: validation.title,
              errors: stepErrors
            })
          }
        }

        if (failedSteps.length > 0) {
          const firstFailedStep = failedSteps[0]
          const errorMsg = `Please complete missing information in Step ${firstFailedStep.step} (${firstFailedStep.title}) before finishing.`
          setError(errorMsg)

          // Redirect to the first step with missing data
          setTimeout(() => {
            router.push(`/${locale}/onboarding/step/${firstFailedStep.step}`)
          }, 2000) // Give user time to read the error message

          return
        }
      }

      // Move to next step or complete using smart navigation
      const mergedData = { ...formData, ...data } as any
      const nextStepNumber = getNextStep(stepNumber as StepNumber, mergedData)

      // Special case: When transitioning from Step 13 to Step 14, create submission first
      if (stepNumber === 13 && nextStepNumber === 14) {
        try {
          // Calculate completion time if we have session start time
          const startTime = sessionId ? localStorage.getItem(`wb-onboarding-start-${sessionId}`) : null
          const completionTimeSeconds = startTime
            ? Math.round((Date.now() - parseInt(startTime)) / 1000)
            : undefined

          // Submit all onboarding data to Supabase (Step 14 will load this submission)
          await submitOnboarding(
            sessionId!,
            { ...formData, ...data } as OnboardingFormData,
            completionTimeSeconds
          )

          // Now navigate to Step 14 (checkout)
          await nextStep()
          router.push(`/${locale}/onboarding/step/${nextStepNumber}`)
        } catch (submitError) {
          console.error('Failed to create submission:', submitError)
          setError(t('submissionError') || 'Failed to create submission. Please try again.')
          return
        }
      }
      // Regular step transitions (not 13→14)
      else if (nextStepNumber && nextStepNumber <= 14) {
        await nextStep()
        router.push(`/${locale}/onboarding/step/${nextStepNumber}`)
      }
      // Step 14 completion - navigate to thank you page
      else {
        router.push(`/${locale}/onboarding/thank-you`)
      }
    } catch (error) {
      console.error('Error proceeding to next step:', error)
      setError(t('nextStepError'))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle previous step using smart navigation
  const handlePrevious = () => {
    // Save current form data before navigating back (especially important for Step 13)
    const currentData = form.getValues()
    if (currentData && Object.keys(currentData).length > 0) {
      updateFormData(currentData as any)
    }

    const prevStepNumber = getPreviousStep(stepNumber as StepNumber, formData)

    if (prevStepNumber && prevStepNumber >= 1) {
      router.push(`/${locale}/onboarding/step/${prevStepNumber}`)
    } else {
      router.push(`/${locale}/onboarding`)
    }
  }

  // Session expired redirect
  if (isSessionExpired) {
    router.push(`/${locale}/onboarding`)
    return null
  }

  // Get step component
  const StepComponent = getStepComponent(stepNumber)

  if (!StepComponent) {
    router.push(`/${locale}/onboarding`)
    return null
  }

  // Calculate smart progress
  const progressPercentage = calculateProgress(stepNumber as StepNumber, formData)

  return (
    <StepTemplate
      stepNumber={stepNumber}
      title={t(`${stepNumber}.title`)}
      description={t(`${stepNumber}.description`)}
      onNext={stepNumber === 14 ? undefined : handleSubmit(handleNext)}
      onPrevious={handlePrevious}
      canGoNext={(stepNumber === 3 ? isStep3Valid : stepNumber === 6 ? isStep6Valid : stepNumber === 11 ? isStep11Valid : stepNumber === 12 ? isStep12Valid : isValid) && !isLoading}
      canGoPrevious={stepNumber > 1}
      isLoading={isLoading}
      error={error}
      nextLabel={stepNumber === 14 ? t('finish') : undefined}
      previousLabel={stepNumber === 1 ? t('back') : undefined}
      hideNavigation={stepNumber === 14}
    >
      <StepComponent
        form={form}
        data={getStepDefaultValues(stepNumber) as any}
        errors={errors}
        isLoading={isLoading}
        error={error}
      />
    </StepTemplate>
  )
}
