import { NextRequest, NextResponse } from 'next/server'
import { EmailService, isEmailServiceConfigured } from '@/services/resend'
import { Locale } from '@/lib/i18n'

/**
 * Test endpoint to trigger individual emails with sample data
 *
 * Usage:
 * POST /api/test/send-email
 * Body: {
 *   emailType: 'verification' | 'completion' | 'admin' | 'preview' | 'recovery' | 'payment-notification' | 'payment-success' | 'custom-software' | 'contact' | 'cancellation-confirmation' | 'cancellation-notification',
 *   toEmail: 'your-email@example.com',
 *   locale?: 'en' | 'it' | 'pl'
 * }
 */
export async function POST(request: NextRequest) {
  // Block access in production - this endpoint is for development/testing only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }

  try {
    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      return NextResponse.json({
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
      }, { status: 500 })
    }

    const { emailType, toEmail, locale = 'en' } = await request.json()

    if (!emailType || !toEmail) {
      return NextResponse.json({
        error: 'emailType and toEmail are required',
        availableTypes: [
          'verification',
          'completion',
          'admin',
          'preview',
          'recovery',
          'payment-notification',
          'payment-success',
          'custom-software',
          'contact',
          'cancellation-confirmation',
          'cancellation-notification'
        ]
      }, { status: 400 })
    }

    let result
    const testData = {
      name: 'Test User',
      businessName: 'Test Business Inc',
      email: toEmail,
      phone: '+1234567890',
      submissionId: 'test-submission-123',
      customerId: 'cus_test123',
      subscriptionId: 'sub_test123',
      sessionId: 'test-session-123'
    }

    switch (emailType) {
      case 'verification':
        result = await EmailService.sendVerificationEmail(
          toEmail,
          testData.name,
          '123456',
          locale as Locale
        )
        break

      case 'completion':
        result = await EmailService.sendCompletionConfirmation(
          toEmail,
          testData.businessName,
          locale as Locale
        )
        break

      case 'admin':
        result = await EmailService.sendAdminNotification(
          {
            businessName: testData.businessName,
            businessEmail: toEmail,
            businessPhone: testData.phone,
            industry: 'Technology',
            businessDescription: 'Test business offering innovative solutions',
            primaryGoal: 'grow-sales',
            businessCity: 'Test City',
            businessProvince: 'Test Province'
          } as any,
          testData.submissionId
        )
        break

      case 'preview':
        result = await EmailService.sendPreviewNotification(
          toEmail,
          testData.businessName,
          'https://example.com/preview/test-123',
          locale as Locale
        )
        break

      case 'recovery':
        result = await EmailService.sendAbandonmentRecovery(
          toEmail,
          testData.name,
          'https://example.com/onboarding/step/5?session=test-123',
          5,
          locale as Locale
        )
        break

      case 'payment-notification':
        result = await EmailService.sendPaymentNotification(
          testData.submissionId,
          testData.businessName,
          toEmail,
          3500, // €35.00
          'EUR',
          'pi_test123',
          []
        )
        break

      case 'payment-success':
        result = await EmailService.sendPaymentSuccessConfirmation(
          toEmail,
          testData.businessName,
          3500, // €35.00
          'EUR',
          locale as Locale
        )
        break

      case 'custom-software':
        result = await EmailService.sendCustomSoftwareInquiry(
          {
            name: testData.name,
            email: toEmail,
            phone: testData.phone,
            description: 'I need a custom software solution for my business needs. Please contact me to discuss the requirements.'
          },
          locale as Locale
        )
        break

      case 'contact':
        result = await EmailService.sendContactInquiry(
          {
            name: testData.name,
            email: toEmail,
            phone: testData.phone,
            details: 'I would like to know more about your services. Please get in touch with me at your earliest convenience.'
          },
          locale as Locale
        )
        break

      case 'cancellation-confirmation':
        result = await EmailService.sendCancellationConfirmation(
          toEmail,
          testData.businessName,
          locale as Locale
        )
        break

      case 'cancellation-notification':
        result = await EmailService.sendCancellationNotification(
          testData.submissionId,
          testData.businessName,
          toEmail,
          testData.subscriptionId,
          Math.floor(Date.now() / 1000)
        )
        break

      default:
        return NextResponse.json({
          error: `Unknown email type: ${emailType}`,
          availableTypes: [
            'verification',
            'completion',
            'admin',
            'preview',
            'recovery',
            'payment-notification',
            'payment-success',
            'custom-software',
            'contact',
            'cancellation-confirmation',
            'cancellation-notification'
          ]
        }, { status: 400 })
    }

    // Handle both boolean and object return types from EmailService
    const success = typeof result === 'boolean' ? result : result.success

    if (success) {
      return NextResponse.json({
        success: true,
        message: `${emailType} email sent to ${toEmail}`,
        emailType,
        locale,
        data: typeof result === 'object' ? result.data : undefined
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Failed to send ${emailType} email`,
        details: typeof result === 'object' ? result.error : 'Email send failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Test email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
