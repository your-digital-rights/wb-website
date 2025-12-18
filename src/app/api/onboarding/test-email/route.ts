import { NextRequest, NextResponse } from 'next/server'
import { EmailService, isEmailServiceConfigured } from '@/services/resend'
import { Locale } from '@/lib/i18n'

export async function POST(request: NextRequest) {
  try {
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      return NextResponse.json({
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
      }, { status: 500 })
    }

    // Get test parameters
    const { email, name = 'Test User', locale = 'en' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Skip sending emails during automated tests (detect by .test@ pattern)
    const isTestEmail = email.includes('.test@')

    if (isTestEmail) {
      console.log('Test email detected - skipping test email API call:', email)
      return NextResponse.json({
        success: true,
        message: `Test verification email skipped for ${email} (test mode)`,
        testCode: '123456',
        testMode: true
      })
    }

    // Send test verification email
    const testCode = '123456'
    const result = await EmailService.sendVerificationEmail(email, name, testCode, locale as Locale)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test verification email sent to ${email}`,
        testCode: testCode,
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to send test email',
        details: result.error
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}