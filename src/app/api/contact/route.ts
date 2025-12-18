import { NextRequest, NextResponse } from 'next/server'
import { ContactFormData } from '@/types/contact'
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

function validateFormData(data: ContactFormData, locale: Locale): {
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

  // Details validation (minimum 15 characters as per requirements)
  if (!data.details || data.details.trim().length < 15) {
    errors.details = locale === 'it'
      ? 'Fornisci maggiori dettagli (almeno 15 caratteri)'
      : locale === 'pl'
      ? 'Podaj wiecej szczegolow (co najmniej 15 znakow)'
      : 'Please provide more details (at least 15 characters)'
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
      console.error('Contact API error:', jsonError)
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body'
        },
        { status: 400 }
      )
    }

    const { formData, locale = 'en' } = body as {
      formData: ContactFormData
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
      console.log('Test email detected - skipping contact inquiry email:', formData.email)
    } else {
      // Dynamically import EmailService only when needed (avoids slow compilation on test requests)
      const { EmailService } = await import('@/services/resend')

      // Send email notification to admin
      const emailSent = await EmailService.sendContactInquiry(formData, locale)

      if (!emailSent) {
        console.error('Failed to send contact inquiry email')
        return NextResponse.json(
          {
            success: false,
            error: locale === 'it'
              ? 'Invio del messaggio non riuscito. Riprova.'
              : 'Failed to send your message. Please try again.'
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: locale === 'it'
        ? 'Grazie! Abbiamo ricevuto il tuo messaggio e ti risponderemo entro 2 giorni lavorativi.'
        : 'Thank you! We received your message and will get back to you within 2 business days.'
    })

  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
