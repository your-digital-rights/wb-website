import { z } from 'zod'

// =============================================================================
// VALIDATION SCHEMAS FOR ALL 12 ONBOARDING STEPS
// =============================================================================

// Helper schemas and validators
const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required')

const urlSchema = z.string()
  .url('Please enter a valid URL (including https://)')
  .min(1, 'URL is required')

const optionalUrlSchema = z.string()
  .refine((val) => {
    if (!val || val.trim() === '') return true
    try {
      new URL(val)
      return true
    } catch {
      return false
    }
  }, 'Please enter a valid URL (including https://)')
  .optional()
  .or(z.literal(''))

const phoneSchema = z.string()
  .regex(/^\+?\d{1,15}$/, 'Please enter a valid phone number')
  .min(1, 'Phone number is required')

const italianVatSchema = z.string()
  .transform((val) => val.toUpperCase())
  .refine((val) => !val || val === '' || /^IT\d{11}$/.test(val), {
    message: 'Please enter a valid Italian VAT number (IT followed by 11 digits)'
  })
  .optional()
  .or(z.literal(''))

// Address schema with Italian focus
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string()
    .regex(/^\d{5}$/, 'Please enter a valid Italian postal code (5 digits)'),
  country: z.string().min(1, 'Country is required'),
  placeId: z.string().optional()
})

// Customer profile slider validation (0-100)
const sliderValueSchema = z.number()
  .min(0, 'Value must be between 0 and 100')
  .max(100, 'Value must be between 0 and 100')

// =============================================================================
// STEP 1: WELCOME & BASIC INFO
// =============================================================================
export const step1Schema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'.-]+$/, 'First name can only contain letters, spaces, and common punctuation'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'.-]+$/, 'Last name can only contain letters, spaces, and common punctuation'),
  email: emailSchema
})

// =============================================================================
// STEP 2: EMAIL VERIFICATION
// =============================================================================
export const step2Schema = z.object({
  emailVerified: z.boolean().refine(val => val === true, {
    message: 'Email verification is required to continue'
  })
})

export const verificationCodeSchema = z.object({
  code: z.string()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Verification code can only contain numbers')
})

// =============================================================================
// STEP 3: BUSINESS BASICS
// =============================================================================
export const step3Schema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(50, 'Business name cannot exceed 50 characters'),
  businessEmail: emailSchema,
  businessPhone: phoneSchema,
  businessStreet: z.string().min(1, 'Street address is required'),
  businessCity: z.string().min(1, 'City is required'),
  businessProvince: z.string().min(1, 'Province is required'),
  businessPostalCode: z.string()
    .regex(/^\d{5}$/, 'Please enter a valid Italian postal code (5 digits)'),
  businessCountry: z.string().default('Italy'),
  businessPlaceId: z.string().optional(),
  industry: z.string().min(1, 'Please select an industry'),
  customIndustry: z.string().optional(),
  vatNumber: italianVatSchema
})

// =============================================================================
// STEP 4: BRAND DEFINITION
// =============================================================================
export const step4Schema = z.object({
  businessDescription: z.string()
    .min(50, 'Please describe your offer in at least 50 characters')
    .max(500, 'Offer description cannot exceed 500 characters'),
  competitorUrls: z.array(z.string().url('Please enter a valid URL (including https://)'))
    .max(3, 'Please provide no more than 3 competitor websites')
    .optional(),
  competitorAnalysis: z.string()
    .max(400, 'Competitor analysis cannot exceed 400 characters')
    .optional()
})

// =============================================================================
// STEP 5: CUSTOMER PROFILE
// =============================================================================
export const step5Schema = z.object({
  customerProfile: z.object({
    budget: sliderValueSchema,
    style: sliderValueSchema,
    motivation: sliderValueSchema,
    decisionMaking: sliderValueSchema,
    loyalty: sliderValueSchema
  })
})

// =============================================================================
// STEP 6: CUSTOMER NEEDS
// =============================================================================
export const step6Schema = z.object({
  customerProblems: z.string()
    .min(30, 'Please describe customer problems in at least 30 characters')
    .max(400, 'Customer problems description cannot exceed 400 characters'),
  customerDelight: z.string()
    .max(400, 'Customer delight description cannot exceed 400 characters')
    .optional()
})

// =============================================================================
// STEP 7: VISUAL INSPIRATION
// =============================================================================
export const step7Schema = z.object({
  websiteReferences: z.array(z.string().url('Please enter a valid URL (including https://)'))
    .max(3, 'Please provide no more than 3 website references')
    .default([])
})

// =============================================================================
// STEP 8: DESIGN STYLE SELECTION
// =============================================================================
export const step8Schema = z.object({
  designStyle: z.enum([
    'minimalist',
    'corporate',
    'playful',
    'bold',
    'editorial',
    'retro'
  ], 'Please select a design style')
})

// =============================================================================
// STEP 9: IMAGE STYLE SELECTION
// =============================================================================
export const step9Schema = z.object({
  imageStyle: z.enum([
    'photorealistic',
    'flat-illustration',
    'line-art',
    'sketch',
    'collage',
    '3d'
  ], 'Please select an image style')
})

// =============================================================================
// STEP 10: COLOR PALETTE
// =============================================================================
export const step10Schema = z.object({
  colorPalette: z.string('Please select a color palette').min(1, 'Please select a color palette')
})

// =============================================================================
// STEP 11: WEBSITE STRUCTURE
// =============================================================================
const websiteSectionSchema = z.enum([
  'hero',
  'contact',
  'about',
  'portfolio',
  'services',
  'testimonials',
  'events'
])

const primaryGoalSchema = z.enum([
  'phone-call',
  'contact-form',
  'visit-location',
  'purchase',
  'other'
])

export const step11Schema = z.object({
  websiteSections: z.array(websiteSectionSchema)
    .min(1, 'Please select at least one website section'),
  primaryGoal: primaryGoalSchema,
  offeringType: z.enum(['products', 'services', 'both']).optional(),
  offerings: z.array(z.string().min(1, 'Offering cannot be empty'))
    .max(6, 'Please provide no more than 6 offerings')
    .optional()
})

// =============================================================================
// STEP 12: BUSINESS ASSETS
// =============================================================================
const uploadedFileSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  fileSize: z.number().max(10 * 1024 * 1024, 'Logo file size cannot exceed 10MB'),
  mimeType: z.string().regex(
    /^image\/(png|jpg|jpeg|svg\+xml)$/,
    'Logo must be PNG, JPG, or SVG format'
  ),
  url: z.string().url(),
  width: z.number().optional(),
  height: z.number().optional(),
  uploadedAt: z.string()
})

const businessPhotoSchema = uploadedFileSchema.extend({
  fileSize: z.number().max(10 * 1024 * 1024, 'Photo file size cannot exceed 10MB'),
  mimeType: z.string().regex(
    /^image\/(png|jpg|jpeg)$/,
    'Business photos must be PNG or JPG format'
  )
})

// File schema for form validation (accepts browser File objects)
const fileSchema = z.custom<File>((file) => {
  return file instanceof File
}, {
  message: 'Expected a File object'
})

export const step12Schema = z.object({
  logoUpload: z.union([fileSchema, uploadedFileSchema]).optional().nullable(),
  businessPhotos: z.union([
    z.array(fileSchema).max(30, 'Please upload no more than 30 business photos'),
    z.array(businessPhotoSchema).max(30, 'Please upload no more than 30 business photos')
  ]).optional().default([])
}).superRefine((data, ctx) => {
  // Calculate total size of business photos
  if (data.businessPhotos && data.businessPhotos.length > 0) {
    let totalSize = 0

    for (const photo of data.businessPhotos) {
      // Handle both File objects (size property) and uploaded file objects (fileSize property)
      const photoSize = photo instanceof File ? photo.size : (photo as any).fileSize
      totalSize += photoSize || 0
    }

    const maxTotalSize = 300 * 1024 * 1024 // 300MB (30 files × 10MB each)

    if (totalSize > maxTotalSize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Total size of business photos cannot exceed 300MB',
        path: ['businessPhotos']
      })
    }
  }
})

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Get schema for a specific step
export function getStepSchema(step: number) {
  const schemas = {
    1: step1Schema,
    2: step2Schema,
    3: step3Schema,
    4: step4Schema,
    5: step5Schema,
    6: step6Schema,
    7: step7Schema,
    8: step8Schema,
    9: step9Schema,
    10: step10Schema,
    11: step11Schema,
    12: step12Schema,
    13: step13Schema,
    14: step14Schema
  }
  
  return schemas[step as keyof typeof schemas] || null
}

// Validate specific step data
export function validateStepData(step: number, data: any) {
  const schema = getStepSchema(step)
  if (!schema) {
    return { success: true, data, error: null }
  }
  
  return schema.safeParse(data)
}

// Validate complete form before submission
export function validateCompleteForm(data: any) {
  return completeFormSchema.safeParse(data)
}

// Get field-specific error messages
export function getFieldError(errors: z.ZodError, fieldPath: string): string | null {
  const fieldError = errors.issues.find(err =>
    err.path.join('.') === fieldPath
  )

  return fieldError?.message || null
}

// =============================================================================
// ITALIAN TRANSLATIONS FOR VALIDATION MESSAGES
// =============================================================================

export const validationMessages = {
  en: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    url: 'Please enter a valid URL',
    phone: 'Please enter a valid phone number',
    minLength: (min: number) => `Must be at least ${min} characters`,
    maxLength: (max: number) => `Cannot exceed ${max} characters`,
    minItems: (min: number) => `Please select at least ${min} item${min > 1 ? 's' : ''}`,
    maxItems: (max: number) => `Please select no more than ${max} item${max > 1 ? 's' : ''}`,
    fileSize: (max: string) => `File size cannot exceed ${max}`,
    fileType: (types: string) => `File must be ${types} format`
  },
  it: {
    required: 'Questo campo è obbligatorio',
    email: 'Inserisci un indirizzo email valido',
    url: 'Inserisci un URL valido',
    phone: 'Inserisci un numero di telefono valido',
    minLength: (min: number) => `Deve essere almeno di ${min} caratteri`,
    maxLength: (max: number) => `Non può superare i ${max} caratteri`,
    minItems: (min: number) => `Seleziona almeno ${min} elemento${min > 1 ? 'i' : ''}`,
    maxItems: (max: number) => `Seleziona non più di ${max} elemento${max > 1 ? 'i' : ''}`,
    fileSize: (max: string) => `La dimensione del file non può superare ${max}`,
    fileType: (types: string) => `Il file deve essere in formato ${types}`
  }
}

// =============================================================================
// CUSTOM VALIDATION HELPERS
// =============================================================================

// Italian phone number validation
export const italianPhoneValidator = z.string().refine(
  (phone) => {
    // Remove spaces and common separators
    const cleaned = phone.replace(/[\s\-\(\)]/g, '')
    // Italian mobile: +39 3XX XXXXXXX or landline: +39 0X XXXXXXXX
    return /^(\+39)?[0-9]{9,11}$/.test(cleaned)
  },
  { message: 'Please enter a valid Italian phone number' }
)

// Website URL validation (more permissive for user input)
export const websiteUrlValidator = z.string().refine(
  (url) => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  },
  { message: 'Please enter a valid website URL' }
)

// Business name validation (Italian business context)
export const italianBusinessNameValidator = z.string().refine(
  (name) => {
    // Allow Italian characters and business suffixes
    return /^[a-zA-ZÀ-ÿ0-9\s&'.-]+(\s+(s\.r\.l\.|S\.R\.L\.|s\.p\.a\.|S\.P\.A\.|s\.n\.c\.|S\.N\.C\.))?$/i.test(name)
  },
  { message: 'Please enter a valid Italian business name' }
)

// =============================================================================
// STEP 13: LANGUAGE ADD-ONS SELECTION
// =============================================================================

export const step13Schema = z.object({
  additionalLanguages: z.array(z.string())
    .refine(
      (codes) => {
        // Validate all codes are valid ISO 639-1 codes
        const validCodes = ['nl', 'fr', 'de', 'pt', 'es', 'da', 'fi', 'no', 'sv',
                           'bg', 'cs', 'hu', 'pl', 'ro', 'sk', 'uk', 'sq', 'bs',
                           'hr', 'el', 'sr', 'sl', 'tr', 'ca', 'lv', 'lt']
        return codes.every(code => validCodes.includes(code))
      },
      { message: 'Invalid language code selected' }
    )
    .refine(
      (codes) => {
        // Ensure English and Italian are not in the selection
        // (they are included in base package)
        return !codes.includes('en') && !codes.includes('it')
      },
      { message: 'English and Italian are already included in the base package' }
    )
    .default([])
})

// =============================================================================
// STEP 14: STRIPE CHECKOUT
// =============================================================================

export const step14Schema = z.object({
  // Payment details are handled by Stripe Elements
  // This schema validates the discount code if provided
  discountCode: z.string()
    .max(50, 'Discount code must be 50 characters or less')
    .regex(/^[A-Z0-9-_]+$/i, 'Discount code can only contain letters, numbers, hyphens, and underscores')
    .optional()
    .or(z.literal('')),

  // Terms and conditions acceptance
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions to proceed'
  })
})

// =============================================================================
// COMPLETE FORM SCHEMA (for final validation)
// =============================================================================
export const completeFormSchema = z.object({
  // Step 1
  firstName: step1Schema.shape.firstName,
  lastName: step1Schema.shape.lastName,
  email: step1Schema.shape.email,

  // Step 2
  emailVerified: step2Schema.shape.emailVerified,

  // Step 3
  businessName: step3Schema.shape.businessName,
  businessEmail: step3Schema.shape.businessEmail,
  businessPhone: step3Schema.shape.businessPhone,
  businessStreet: step3Schema.shape.businessStreet,
  businessCity: step3Schema.shape.businessCity,
  businessProvince: step3Schema.shape.businessProvince,
  businessPostalCode: step3Schema.shape.businessPostalCode,
  businessCountry: step3Schema.shape.businessCountry,
  businessPlaceId: step3Schema.shape.businessPlaceId,
  industry: step3Schema.shape.industry,
  customIndustry: step3Schema.shape.customIndustry,
  vatNumber: step3Schema.shape.vatNumber,

  // Step 4
  businessDescription: step4Schema.shape.businessDescription,
  competitorUrls: step4Schema.shape.competitorUrls,
  competitorAnalysis: step4Schema.shape.competitorAnalysis,

  // Step 5
  customerProfile: step5Schema.shape.customerProfile,

  // Step 6
  customerProblems: step6Schema.shape.customerProblems,
  customerDelight: step6Schema.shape.customerDelight,

  // Step 7
  websiteReferences: step7Schema.shape.websiteReferences,

  // Step 8
  designStyle: step8Schema.shape.designStyle,

  // Step 9
  imageStyle: step9Schema.shape.imageStyle,

  // Step 10
  colorPalette: step10Schema.shape.colorPalette,

  // Step 11
  websiteSections: step11Schema.shape.websiteSections,
  primaryGoal: step11Schema.shape.primaryGoal,
  offeringType: step11Schema.shape.offeringType,
  offerings: step11Schema.shape.offerings,

  // Step 12
  logoUpload: step12Schema.shape.logoUpload,
  businessPhotos: step12Schema.shape.businessPhotos,

  // Step 13
  additionalLanguages: step13Schema.shape.additionalLanguages,

  // Step 14
  discountCode: step14Schema.shape.discountCode,
  acceptTerms: step14Schema.shape.acceptTerms,
})

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// Step form data types (inferred from schemas)
export type Step1FormData = z.infer<typeof step1Schema>
export type Step2FormData = z.infer<typeof step2Schema>
export type Step3FormData = z.infer<typeof step3Schema>
export type Step4FormData = z.infer<typeof step4Schema>
export type Step5FormData = z.infer<typeof step5Schema>
export type Step6FormData = z.infer<typeof step6Schema>
export type Step7FormData = z.infer<typeof step7Schema>
export type Step8FormData = z.infer<typeof step8Schema>
export type Step9FormData = z.infer<typeof step9Schema>
export type Step10FormData = z.infer<typeof step10Schema>
export type Step11FormData = z.infer<typeof step11Schema>
export type Step12FormData = z.infer<typeof step12Schema>
export type Step13FormData = z.infer<typeof step13Schema>
export type Step14FormData = z.infer<typeof step14Schema>

// Flat type containing all fields from all steps (Option A)
// All fields are optional to allow progressive form filling
export type StepFormData = Partial<
  Step1FormData &
  Step2FormData &
  Step3FormData &
  Step4FormData &
  Step5FormData &
  Step6FormData &
  Step7FormData &
  Step8FormData &
  Step9FormData &
  Step10FormData &
  Step11FormData &
  Step12FormData &
  Step13FormData &
  Step14FormData
>

// Complete onboarding data type
export type OnboardingFormData = z.infer<typeof completeFormSchema>