/**
 * Smart step navigation logic for onboarding
 * Handles conditional skipping based on business type and user selections
 */

import { OnboardingFormData, StepNumber } from '@/types/onboarding'

export interface StepConfig {
  number: StepNumber
  title: string
  description: string
  isOptional?: boolean
  skipCondition?: (formData: Partial<OnboardingFormData>) => boolean
  estimatedMinutes: number
}

/**
 * Configuration for all onboarding steps with conditional logic
 */
export const STEP_CONFIGS: Record<StepNumber, StepConfig> = {
  1: {
    number: 1,
    title: 'Welcome',
    description: 'Personal information',
    estimatedMinutes: 2
  },
  2: {
    number: 2,
    title: 'Email Verification',
    description: 'Verify your email address',
    estimatedMinutes: 1
  },
  3: {
    number: 3,
    title: 'Business Basics',
    description: 'Essential business information',
    estimatedMinutes: 3
  },
  4: {
    number: 4,
    title: 'Brand Definition',
    description: 'Describe your business and offerings',
    estimatedMinutes: 4
  },
  5: {
    number: 5,
    title: 'Customer Profile',
    description: 'Define your target audience',
    estimatedMinutes: 3
  },
  6: {
    number: 6,
    title: 'Customer Needs',
    description: 'What problems do you solve?',
    estimatedMinutes: 4
  },
  7: {
    number: 7,
    title: 'Visual Inspiration',
    description: 'Website references you like',
    isOptional: true,
    skipCondition: (formData) => {
      // Skip if user selected very simple design preferences
      return formData.designStyle === 'minimalist' && !formData.websiteReferences?.length
    },
    estimatedMinutes: 3
  },
  8: {
    number: 8,
    title: 'Design Style',
    description: 'Choose your visual aesthetic',
    estimatedMinutes: 2
  },
  9: {
    number: 9,
    title: 'Image Style',
    description: 'Type of imagery for your site',
    estimatedMinutes: 2
  },
  10: {
    number: 10,
    title: 'Color Palette',
    description: 'Choose your brand colors',
    estimatedMinutes: 2
  },
  11: {
    number: 11,
    title: 'Website Structure',
    description: 'Pages and functionality needed',
    estimatedMinutes: 4
  },
  12: {
    number: 12,
    title: 'Business Assets',
    description: 'Upload logo and photos',
    isOptional: true,
    estimatedMinutes: 3
  },
  13: {
    number: 13,
    title: 'Language Add-ons',
    description: 'Select additional languages for your website',
    isOptional: true,
    estimatedMinutes: 2
  },
  14: {
    number: 14,
    title: 'Payment',
    description: '30-day money back guarantee',
    estimatedMinutes: 3
  }
}

/**
 * Determines which steps should be skipped based on current form data
 */
export function getSkippableSteps(formData: Partial<OnboardingFormData>): StepNumber[] {
  const skippableSteps: StepNumber[] = []

  for (const [stepNum, config] of Object.entries(STEP_CONFIGS)) {
    const stepNumber = parseInt(stepNum) as StepNumber

    if (config.skipCondition && config.skipCondition(formData)) {
      skippableSteps.push(stepNumber)
    }
  }

  return skippableSteps
}

/**
 * Gets the next step to navigate to, considering skip conditions
 */
export function getNextStep(
  currentStep: StepNumber,
  formData: Partial<OnboardingFormData>
): StepNumber | null {
  const skippableSteps = getSkippableSteps(formData)
  let nextStep = (currentStep + 1) as StepNumber

  // Keep incrementing until we find a non-skippable step or reach the end
  while (nextStep <= 14 && skippableSteps.includes(nextStep)) {
    nextStep = (nextStep + 1) as StepNumber
  }

  return nextStep <= 14 ? nextStep : null
}

/**
 * Gets the previous step to navigate to, considering skip conditions
 */
export function getPreviousStep(
  currentStep: StepNumber,
  formData: Partial<OnboardingFormData>
): StepNumber | null {
  const skippableSteps = getSkippableSteps(formData)
  let prevStep = (currentStep - 1) as StepNumber

  // Keep decrementing until we find a non-skippable step or reach the beginning
  while (prevStep >= 1 && skippableSteps.includes(prevStep)) {
    prevStep = (prevStep - 1) as StepNumber
  }

  return prevStep >= 1 ? prevStep : null
}

/**
 * Gets the total estimated completion time based on non-skipped steps
 */
export function getEstimatedCompletionTime(formData: Partial<OnboardingFormData>): number {
  const skippableSteps = getSkippableSteps(formData)
  let totalMinutes = 0

  for (const [stepNum, config] of Object.entries(STEP_CONFIGS)) {
    const stepNumber = parseInt(stepNum) as StepNumber

    if (!skippableSteps.includes(stepNumber)) {
      totalMinutes += config.estimatedMinutes
    }
  }

  return totalMinutes
}

/**
 * Gets the list of steps that will be completed (non-skipped)
 */
export function getActiveSteps(formData: Partial<OnboardingFormData>): StepConfig[] {
  const skippableSteps = getSkippableSteps(formData)

  return Object.values(STEP_CONFIGS).filter(
    config => !skippableSteps.includes(config.number)
  )
}

/**
 * Calculates the current progress percentage
 */
export function calculateProgress(
  currentStep: StepNumber,
  formData: Partial<OnboardingFormData>
): number {
  const activeSteps = getActiveSteps(formData)
  const completedActiveSteps = activeSteps.filter(step => step.number < currentStep).length

  return Math.round((completedActiveSteps / activeSteps.length) * 100)
}

/**
 * Business type detection based on form data
 */
export function detectBusinessType(formData: Partial<OnboardingFormData>): BusinessType {
  // Analyze industry and products to determine business type
  const industry = formData.industry?.toLowerCase() || ''
  const businessDesc = formData.businessDescription?.toLowerCase() || ''
  const offeringType = formData.offeringType

  // E-commerce indicators
  if (offeringType === 'products' ||
      industry.includes('retail') ||
      industry.includes('e-commerce') ||
      businessDesc.includes('sell') ||
      businessDesc.includes('shop') ||
      formData.primaryGoal === 'purchase') {
    return 'ecommerce'
  }

  // Service business indicators
  if (offeringType === 'services' ||
      industry.includes('consulting') ||
      industry.includes('service') ||
      businessDesc.includes('service') ||
      formData.primaryGoal === 'call-book' ||
      formData.primaryGoal === 'contact-form') {
    return 'service'
  }

  // Restaurant/hospitality indicators
  if (industry.includes('restaurant') ||
      industry.includes('food') ||
      industry.includes('hospitality') ||
      businessDesc.includes('restaurant') ||
      businessDesc.includes('food') ||
      formData.primaryGoal === 'visit-location') {
    return 'restaurant'
  }

  // Creative/portfolio indicators
  if (industry.includes('creative') ||
      industry.includes('design') ||
      industry.includes('art') ||
      industry.includes('photography') ||
      formData.websiteSections?.includes('gallery') ||
      businessDesc.includes('portfolio')) {
    return 'portfolio'
  }

  return 'general'
}

export type BusinessType = 'ecommerce' | 'service' | 'restaurant' | 'portfolio' | 'general'

/**
 * Business type specific recommendations
 */
export const BUSINESS_TYPE_CONFIGS: Record<BusinessType, {
  recommendedSections: string[]
  skipOptionalSteps: boolean
  focusAreas: string[]
}> = {
  ecommerce: {
    recommendedSections: ['products-services', 'testimonials', 'contact'],
    skipOptionalSteps: false,
    focusAreas: ['product photos', 'payment integration', 'customer reviews']
  },
  service: {
    recommendedSections: ['about-us', 'testimonials', 'contact'],
    skipOptionalSteps: true,
    focusAreas: ['credibility', 'contact forms', 'service descriptions']
  },
  restaurant: {
    recommendedSections: ['about-us', 'gallery', 'contact', 'events'],
    skipOptionalSteps: false,
    focusAreas: ['food photography', 'location info', 'menu display']
  },
  portfolio: {
    recommendedSections: ['about-us', 'gallery', 'testimonials', 'contact'],
    skipOptionalSteps: false,
    focusAreas: ['visual presentation', 'project showcases', 'creative assets']
  },
  general: {
    recommendedSections: ['about-us', 'contact'],
    skipOptionalSteps: true,
    focusAreas: ['clear messaging', 'professional appearance', 'contact information']
  }
}

/**
 * Get recommendations based on detected business type
 */
export function getBusinessTypeRecommendations(
  formData: Partial<OnboardingFormData>
): typeof BUSINESS_TYPE_CONFIGS[BusinessType] {
  const businessType = detectBusinessType(formData)
  return BUSINESS_TYPE_CONFIGS[businessType]
}