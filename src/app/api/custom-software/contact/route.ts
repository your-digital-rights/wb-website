import { NextRequest, NextResponse } from 'next/server'
import { CustomSoftwareFormData } from '@/types/custom-software'
import { Locale } from '@/lib/i18n'

// Validation helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
  // Allow various phone formats (international, with/without spaces, dashes, parentheses)
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8
}

function validateFormData(data: CustomSoftwareFormData, locale: Locale): {
  isValid: boolean
  errors: Record<string, string>
} {
  const errors: Record<string, string> = {}

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.name = locale === 'it'
      ? 'Il nome deve contenere almeno 2 caratteri'
      : locale === 'pl'
      ? 'Imie musi zawierac co najmniej 2 znaki'
      : 'Name must be at least 2 characters'
  }

  // Email validation
  if (!data.email) {
    errors.email = locale === 'it'
      ? "L'email è obbligatoria"
      : locale === 'pl'
      ? 'Email jest wymagany'
      : 'Email is required'
  } else if (!isValidEmail(data.email)) {
    errors.email = locale === 'it'
      ? 'Inserisci un indirizzo email valido'
      : locale === 'pl'
      ? 'Wprowadz prawidlowy adres email'
      : 'Please enter a valid email address'
  }

  // Phone validation
  if (!data.phone) {
    errors.phone = locale === 'it'
      ? 'Il telefono è obbligatorio'
      : locale === 'pl'
      ? 'Telefon jest wymagany'
      : 'Phone is required'
  } else if (!isValidPhone(data.phone)) {
    errors.phone = locale === 'it'
      ? 'Inserisci un numero di telefono valido'
      : locale === 'pl'
      ? 'Wprowadz prawidlowy numer telefonu'
      : 'Please enter a valid phone number'
  }

  // Description validation
  if (!data.description || data.description.trim().length < 20) {
    errors.description = locale === 'it'
      ? 'Fornisci maggiori dettagli (almeno 20 caratteri)'
      : locale === 'pl'
      ? 'Podaj wiecej szczegolow (co najmniej 20 znakow)'
      : 'Please provide more details (at least 20 characters)'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

export async function POST(request: NextRequest) {
  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      console.error('Custom software contact API error:', jsonError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body'
        },
        { status: 400 }
      )
    }

    const { formData, locale = 'en' } = body as {
      formData: CustomSoftwareFormData
      locale?: Locale
    }

    // Validate required fields
    if (!formData) {
      return NextResponse.json(
        {
          success: false,
          error: locale === 'it'
            ? 'Dati del modulo mancanti'
            : 'Missing form data'
        },
        { status: 400 }
      )
    }

    // Validate form data
    const validation = validateFormData(formData, locale)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          errors: validation.errors
        },
        { status: 400 }
      )
    }

    // Skip sending emails during automated tests (detect by .test@ pattern)
    const isTestEmail = formData.email.includes('.test@')

    if (isTestEmail) {
      console.log('Test email detected - skipping custom software inquiry email:', formData.email)
    } else {
      // Dynamically import EmailService only when needed (avoids slow compilation on test requests)
      const { EmailService } = await import('@/services/resend')

      // Send email notification to admin
      const emailSent = await EmailService.sendCustomSoftwareInquiry(formData, locale)

      if (!emailSent) {
        console.error('Failed to send custom software inquiry email')
        return NextResponse.json(
          {
            success: false,
            error: locale === 'it'
              ? 'Invio non riuscito. Riprova.'
              : 'Failed to send your request. Please try again.'
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: locale === 'it'
        ? 'Grazie! Ti contatteremo entro 2 giorni lavorativi.'
        : 'Thank you! We will be in touch within 2 business days.'
    })

  } catch (error) {
    console.error('Custom software contact API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
