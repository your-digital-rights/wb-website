import { ComponentType } from 'react'
import { UseFormReturn, FieldErrors } from 'react-hook-form'
import { StepFormData } from '@/schemas/onboarding'

// Step component imports
import { Step1Welcome } from './Step1Welcome'
import { Step2EmailVerification } from './Step2EmailVerification'
import { Step3BusinessBasics } from './Step3BusinessBasics'
import { Step4BrandDefinition } from './Step4BrandDefinition'
import { Step5CustomerProfile } from './Step5CustomerProfile'
import { Step6CustomerNeeds } from './Step6CustomerNeeds'
import { Step7VisualInspiration } from './Step7VisualInspiration'
import { Step8DesignStyle } from './Step8DesignStyle'
import { Step9ImageStyle } from './Step9ImageStyle'
import { Step10ColorPalette } from './Step10ColorPalette'
import { Step11WebsiteStructure } from './Step11WebsiteStructure'
import { Step12BusinessAssets } from './Step12BusinessAssets'
import { Step13AddOns } from './Step13AddOns'
import { Step14Checkout } from './Step14Checkout'

export interface StepComponentProps {
  form: UseFormReturn<StepFormData>
  data?: StepFormData
  errors: FieldErrors<StepFormData>
  isLoading: boolean
  error?: string
}

type StepComponent = ComponentType<StepComponentProps>

// Step component mapping
const stepComponents: Record<number, StepComponent> = {
  1: Step1Welcome,
  2: Step2EmailVerification,
  3: Step3BusinessBasics,
  4: Step4BrandDefinition,
  5: Step5CustomerProfile,
  6: Step6CustomerNeeds,
  7: Step7VisualInspiration,
  8: Step8DesignStyle,
  9: Step9ImageStyle,
  10: Step10ColorPalette,
  11: Step11WebsiteStructure,
  12: Step12BusinessAssets,
  13: Step13AddOns,
  14: Step14Checkout,
}

export function getStepComponent(stepNumber: number): StepComponent | null {
  return stepComponents[stepNumber] || null
}

// Export step titles for navigation
export const stepTitles: Record<number, string> = {
  1: 'welcome',
  2: 'emailVerification',
  3: 'businessBasics',
  4: 'brandDefinition',
  5: 'customerProfile',
  6: 'customerNeeds',
  7: 'visualInspiration',
  8: 'designStyle',
  9: 'imageStyle',
  10: 'colorPalette',
  11: 'websiteStructure',
  12: 'businessAssets',
  13: 'languageAddOns',
  14: 'checkout',
}

export {
  Step1Welcome,
  Step2EmailVerification,
  Step3BusinessBasics,
  Step4BrandDefinition,
  Step5CustomerProfile,
  Step6CustomerNeeds,
  Step7VisualInspiration,
  Step8DesignStyle,
  Step9ImageStyle,
  Step10ColorPalette,
  Step11WebsiteStructure,
  Step12BusinessAssets,
  Step13AddOns,
  Step14Checkout,
}