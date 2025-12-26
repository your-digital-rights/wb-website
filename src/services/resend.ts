import { Resend } from 'resend'
import { OnboardingFormData, EmailVerificationResponse } from '@/types/onboarding'
import { CustomSoftwareFormData } from '@/types/custom-software'
import { ContactFormData } from '@/types/contact'
import { Locale } from '@/lib/i18n'

// =============================================================================
// RESEND EMAIL SERVICE CONFIGURATION
// =============================================================================

const resend = new Resend(process.env.RESEND_API_KEY || process.env.RESEND_KEY)

// Email configuration from environment
const FROM_EMAIL = process.env.NOTIFICATION_FROM_EMAIL || (process.env.NODE_ENV === 'development' ? 'onboarding@resend.dev' : 'noreply@notifications.whiteboar.it')
const FROM_NAME = process.env.FROM_NAME || 'WhiteBoar'
const ADMIN_EMAIL = process.env.NOTIFICATION_ADMIN_EMAIL || 'admin@whiteboar.it'
const SUPPORT_EMAIL = process.env.NOTIFICATION_SUPPORT_EMAIL || 'info@whiteboar.it'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://whiteboar.it'

// Test mode configuration - skip sending real emails in dev/test/CI/preview unless explicitly enabled
const ENABLE_EMAILS = process.env.ENABLE_EMAILS === 'true'
const isLocalUrl = (value?: string): boolean => {
  if (!value) {
    return false
  }
  try {
    const url = new URL(value)
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '0.0.0.0'
  } catch {
    return false
  }
}
const IS_LOCAL_TESTING =
  process.env.NEXT_PUBLIC_ENV === 'development' ||
  isLocalUrl(process.env.NEXT_PUBLIC_APP_URL) ||
  isLocalUrl(process.env.BASE_URL)
const SHOULD_SKIP_BY_DEFAULT =
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development' ||
  process.env.CI === 'true' ||
  process.env.VERCEL_ENV === 'preview' ||
  IS_LOCAL_TESTING
const IS_TEST_MODE = !ENABLE_EMAILS && SHOULD_SKIP_BY_DEFAULT

// Validate Resend API key (only warn in production)
if (!process.env.RESEND_API_KEY && !process.env.RESEND_KEY && process.env.NODE_ENV === 'production') {
  console.error('ERROR: RESEND_API_KEY or RESEND_KEY environment variable is not set in production')
}

/**
 * Sanitize a string for use as a Resend email tag value.
 * Resend requires tags to only contain ASCII letters, numbers, underscores, or dashes.
 */
function sanitizeTagValue(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 256) // Resend has a 256 char limit per tag value
}

// =============================================================================
// EMAIL SERVICE CLASS
// =============================================================================

export class EmailService {

  // ===========================================================================
  // VERIFICATION EMAILS
  // ===========================================================================

  /**
   * Send email verification code
   */
  static async sendVerificationEmail(
    email: string,
    name: string,
    verificationCode: string,
    locale: Locale = 'en'
  ): Promise<EmailVerificationResponse> {
    try {
      const subject = locale === 'it'
        ? 'Codice di verifica WhiteBoar'
        : locale === 'pl'
        ? 'Kod weryfikacyjny WhiteBoar'
        : 'WhiteBoar Verification Code'

      const htmlContent = this.generateVerificationEmailHTML(
        name,
        verificationCode,
        locale
      )

      const textContent = this.generateVerificationEmailText(
        name,
        verificationCode,
        locale
      )

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping verification email send:', {
          to: email,
          subject,
          verificationCode
        })
        return {
          success: true,
          data: {
            sent: true,
            attemptsRemaining: 5
          }
        }
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'verification' },
          { name: 'locale', value: locale }
        ]
      })

      if (error) {
        console.error('Resend error:', error)
        return {
          success: false,
          error: {
            message: 'Failed to send verification email',
            code: 'EMAIL_SEND_FAILED',
            details: error
          },
          data: {
            sent: false,
            attemptsRemaining: 0
          }
        }
      }

      console.log('Verification email sent successfully:', data)
      
      return {
        success: true,
        data: {
          sent: true,
          attemptsRemaining: 5 // Default attempts
        }
      }
    } catch (error) {
      console.error('Send verification email error:', error)
      
      return {
        success: false,
        error: {
          message: 'Failed to send verification email',
          code: 'EMAIL_SERVICE_ERROR',
          details: error
        },
        data: {
          sent: false,
          attemptsRemaining: 0
        }
      }
    }
  }

  // ===========================================================================
  // COMPLETION & NOTIFICATION EMAILS
  // ===========================================================================

  /**
   * Send completion confirmation to user
   */
  static async sendCompletionConfirmation(
    email: string,
    businessName: string,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? `Grazie ${businessName}! La tua richiesta è stata ricevuta`
        : locale === 'pl'
        ? `Dziekujemy ${businessName}! Twoje zamowienie zostalo odebrane`
        : `Thank you ${businessName}! Your request has been received`

      const htmlContent = this.generateCompletionEmailHTML(businessName, locale)
      const textContent = this.generateCompletionEmailText(businessName, locale)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping completion confirmation email:', {
          to: email,
          subject,
          businessName
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'completion' },
          { name: 'locale', value: locale }
        ]
      })

      if (error) {
        console.error('Failed to send completion confirmation:', error)
        return false
      }

      console.log('Completion confirmation sent:', data)
      return true
    } catch (error) {
      console.error('Send completion confirmation error:', error)
      return false
    }
  }

  /**
   * Send admin notification for new submission
   */
  static async sendAdminNotification(
    formData: OnboardingFormData,
    submissionId: string
  ): Promise<boolean> {
    try {
      const subject = `New Onboarding Submission: ${formData.businessName}`

      const htmlContent = this.generateAdminNotificationHTML(formData, submissionId)
      const textContent = this.generateAdminNotificationText(formData, submissionId)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping admin notification email:', {
          to: ADMIN_EMAIL,
          subject,
          submissionId
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'admin_notification' },
          { name: 'business_name', value: sanitizeTagValue(formData.businessName) }
        ]
      })

      if (error) {
        console.error('Failed to send admin notification:', error)
        return false
      }

      console.log('Admin notification sent:', data)
      return true
    } catch (error) {
      console.error('Send admin notification error:', error)
      return false
    }
  }

  /**
   * Send preview ready notification
   */
  static async sendPreviewNotification(
    email: string,
    businessName: string,
    previewUrl: string,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? `${businessName} - La tua anteprima è pronta!`
        : locale === 'pl'
        ? `${businessName} - Twoj podglad jest gotowy!`
        : `${businessName} - Your preview is ready!`

      const htmlContent = this.generatePreviewEmailHTML(businessName, previewUrl, locale)
      const textContent = this.generatePreviewEmailText(businessName, previewUrl, locale)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping preview notification email:', {
          to: email,
          subject,
          businessName,
          previewUrl
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'preview_ready' },
          { name: 'locale', value: locale }
        ]
      })

      if (error) {
        console.error('Failed to send preview notification:', error)
        return false
      }

      console.log('Preview notification sent:', data)
      return true
    } catch (error) {
      console.error('Send preview notification error:', error)
      return false
    }
  }

  /**
   * Send abandonment recovery email
   */
  static async sendAbandonmentRecovery(
    email: string,
    name: string,
    sessionId: string,
    currentStep: number,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? 'Non perdere la tua creazione WhiteBoar'
        : locale === 'pl'
        ? 'Nie strać swojej kreacji WhiteBoar'
        : "Don't lose your WhiteBoar creation"

      const recoveryUrl = `${APP_URL}/onboarding?sessionId=${sessionId}`

      const htmlContent = this.generateRecoveryEmailHTML(name, recoveryUrl, currentStep, locale)
      const textContent = this.generateRecoveryEmailText(name, recoveryUrl, currentStep, locale)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping abandonment recovery email:', {
          to: email,
          subject,
          sessionId,
          currentStep
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'abandonment_recovery' },
          { name: 'locale', value: locale },
          { name: 'step', value: currentStep.toString() }
        ]
      })

      if (error) {
        console.error('Failed to send abandonment recovery:', error)
        return false
      }

      console.log('Abandonment recovery email sent:', data)
      return true
    } catch (error) {
      console.error('Send abandonment recovery error:', error)
      return false
    }
  }

  // ===========================================================================
  // HTML EMAIL TEMPLATES
  // ===========================================================================

  /**
   * Generate common email header with WhiteBoar logo
   */
  private static generateEmailHeader(locale: Locale = 'en'): string {
    const logoUrl = `${APP_URL}/images/logo-whiteboar-black.png`

    return `
      <div style="background: white; padding: 30px 20px; text-align: center; border-bottom: 1px solid #e5e7eb;">
        <img src="${logoUrl}" alt="WhiteBoar" style="height: 50px; width: auto;" />
      </div>
    `
  }

  /**
   * Generate common email footer with branding
   */
  private static generateEmailFooter(locale: Locale = 'en'): string {
    const content = locale === 'it' ? {
      support: 'Hai bisogno di aiuto?',
      contactUs: 'Contattaci',
      copyright: '© 2025 WhiteBoar. Tutti i diritti riservati.',
      unsubscribe: 'Non vuoi più ricevere queste email?'
    } : locale === 'pl' ? {
      support: 'Potrzebujesz pomocy?',
      contactUs: 'Skontaktuj sie z nami',
      copyright: '© 2025 WhiteBoar. Wszelkie prawa zastrzezone.',
      unsubscribe: 'Nie chcesz otrzymywac tych emaili?'
    } : {
      support: 'Need help?',
      contactUs: 'Contact us',
      copyright: '© 2025 WhiteBoar. All rights reserved.',
      unsubscribe: 'Don\'t want to receive these emails?'
    }

    return `
      <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 15px 0;">
          <strong>${content.support}</strong><br>
          <a href="${SUPPORT_EMAIL}" style="color: #667eea; text-decoration: none;">${content.contactUs}</a>
        </p>
        <p style="margin: 0; color: #999; font-size: 12px;">
          ${content.copyright}
        </p>
      </div>
    `
  }

  private static generateVerificationEmailHTML(
    name: string,
    code: string,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      greeting: `Ciao ${name},`,
      message: 'Ecco il tuo codice di verifica per continuare la creazione del tuo sito web WhiteBoar:',
      codeLabel: 'Il tuo codice:',
      instructions: 'Inserisci questo codice nella pagina di verifica per continuare.',
      expires: 'Questo codice scade tra 15 minuti.',
      support: 'Hai bisogno di aiuto?',
      contactUs: 'Contattaci',
      thanks: 'Grazie,<br>Il team WhiteBoar'
    } : locale === 'pl' ? {
      greeting: `Czesc ${name},`,
      message: 'Oto Twoj kod weryfikacyjny do kontynuowania tworzenia strony WhiteBoar:',
      codeLabel: 'Twoj kod:',
      instructions: 'Wpisz ten kod na stronie weryfikacji, aby kontynuowac.',
      expires: 'Ten kod wygasa za 15 minut.',
      support: 'Potrzebujesz pomocy?',
      contactUs: 'Skontaktuj sie z nami',
      thanks: 'Dziekujemy,<br>Zespol WhiteBoar'
    } : {
      greeting: `Hello ${name},`,
      message: 'Here\'s your verification code to continue creating your WhiteBoar website:',
      codeLabel: 'Your code:',
      instructions: 'Enter this code on the verification page to continue.',
      expires: 'This code expires in 15 minutes.',
      support: 'Need help?',
      contactUs: 'Contact us',
      thanks: 'Thanks,<br>The WhiteBoar Team'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${locale === 'it' ? 'Codice di verifica WhiteBoar' : locale === 'pl' ? 'Kod weryfikacyjny WhiteBoar' : 'WhiteBoar Verification Code'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 40px 30px; }
            .code-container { text-align: center; margin: 30px 0; }
            .code { display: inline-block; background: #f8f9fa; border: 2px dashed #667eea; padding: 20px 30px; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #667eea; border-radius: 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div class="content">
              <p>${content.greeting}</p>
              <p>${content.message}</p>

              <div class="code-container">
                <div style="font-weight: bold; margin-bottom: 10px; color: #667eea;">${content.codeLabel}</div>
                <div class="code">${code}</div>
              </div>

              <p>${content.instructions}</p>
              <p style="color: #666; font-size: 14px;"><em>${content.expires}</em></p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

              <p>${content.support} <a href="mailto:${SUPPORT_EMAIL}" class="button">${content.contactUs}</a></p>

              <p>${content.thanks}</p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateCompletionEmailHTML(
    businessName: string,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Richiesta Ricevuta!',
      greeting: `Ciao ${businessName}!`,
      message: 'Abbiamo ricevuto la tua richiesta per la creazione del sito web. Il nostro team inizierà a lavorare sulla tua anteprima personalizzata.',
      timeline: 'La tua anteprima sarà pronta in <strong>5 giorni lavorativi</strong>.',
      notification: 'Ti invieremo un\'email quando sarà pronta per la revisione.',
      payment: 'Il pagamento sarà richiesto solo dopo aver approvato l\'anteprima.',
      questions: 'Hai domande? Siamo qui per aiutarti.',
      thanks: 'Grazie per aver scelto WhiteBoar!'
    } : locale === 'pl' ? {
      title: 'Zamowienie otrzymane!',
      greeting: `Czesc ${businessName}!`,
      message: 'Otrzymalismy Twoje zamowienie na tworzenie strony internetowej. Nasz zespol rozpocznie prace nad Twoim spersonalizowanym podgladem.',
      timeline: 'Twoj podglad bedzie gotowy w ciagu <strong>5 dni roboczych</strong>.',
      notification: 'Wyslesz Ci email, gdy bedzie gotowy do przejrzenia.',
      payment: 'Platnosc zostanie poproszona tylko po zatwierdzeniu podgladu.',
      questions: 'Masz pytania? Jestesmy tutaj, aby pomoc.',
      thanks: 'Dziekujemy za wybranie WhiteBoar!'
    } : {
      title: 'Request Received!',
      greeting: `Hello ${businessName}!`,
      message: 'We\'ve received your request for website creation. Our team will start working on your custom preview.',
      timeline: 'Your preview will be ready in <strong>5 business days</strong>.',
      notification: 'We\'ll send you an email when it\'s ready for review.',
      payment: 'Payment will only be required after you approve the preview.',
      questions: 'Have questions? We\'re here to help.',
      thanks: 'Thank you for choosing WhiteBoar!'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 40px 30px; }
            .highlight { background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div class="content">
              <p style="font-size: 18px;">${content.greeting}</p>

              <p>${content.message}</p>

              <div class="highlight">
                <p style="margin: 0; font-size: 18px;">${content.timeline}</p>
              </div>

              <p>${content.notification}</p>
              <p>${content.payment}</p>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

              <p>${content.questions} <a href="mailto:${SUPPORT_EMAIL}" class="button">${locale === 'it' ? 'Contattaci' : 'Contact Us'}</a></p>

              <p style="font-size: 18px; color: #10b981;"><strong>${content.thanks}</strong></p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateAdminNotificationHTML(
    formData: OnboardingFormData,
    submissionId: string
  ): string {
    const adminUrl = `${APP_URL}/admin/submissions/${submissionId}`

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Onboarding Submission</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; }
            .info-label { font-weight: bold; color: #374151; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader('en')}
            <div style="background: #1f2937; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0 0 10px 0;">🚀 New Onboarding Submission</h1>
              <p style="margin: 0;">A new business has completed the onboarding process!</p>
            </div>
            <div class="content">
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Business Name</div>
                  <div>${formData.businessName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Contact Email</div>
                  <div>${formData.businessEmail}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Phone</div>
                  <div>${formData.businessPhone}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Industry</div>
                  <div>${formData.industry}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Location</div>
                  <div>${formData.businessCity || 'N/A'}, ${formData.businessProvince || 'N/A'}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Primary Goal</div>
                  <div>${formData.primaryGoal}</div>
                </div>
              </div>

              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <strong>Business Offer:</strong><br>
                ${formData.businessDescription}
              </div>

              <p><strong>Next Steps:</strong></p>
              <ol>
                <li>Review the complete submission in the admin panel</li>
                <li>Begin creating the website preview</li>
                <li>Send preview notification when ready</li>
              </ol>

              <p style="text-align: center;">
                <a href="${adminUrl}" class="button">View Full Submission</a>
              </p>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                Submission ID: ${submissionId}
              </p>
            </div>
            ${this.generateEmailFooter('en')}
          </div>
        </body>
      </html>
    `
  }

  // ===========================================================================
  // TEXT EMAIL TEMPLATES (Fallback for HTML)
  // ===========================================================================

  private static generateVerificationEmailText(
    name: string,
    code: string,
    locale: Locale
  ): string {
    return locale === 'it' 
      ? `Ciao ${name},\n\nEcco il tuo codice di verifica WhiteBoar: ${code}\n\nInserisci questo codice per continuare la creazione del tuo sito web.\n\nIl codice scade tra 15 minuti.\n\nHai bisogno di aiuto? Contattaci: ${SUPPORT_EMAIL}\n\nGrazie,\nIl team WhiteBoar`
      : `Hello ${name},\n\nYour WhiteBoar verification code is: ${code}\n\nEnter this code to continue creating your website.\n\nThis code expires in 15 minutes.\n\nNeed help? Contact us: ${SUPPORT_EMAIL}\n\nThanks,\nThe WhiteBoar Team`
  }

  private static generateCompletionEmailText(
    businessName: string,
    locale: Locale
  ): string {
    return locale === 'it'
      ? `Ciao ${businessName}!\n\nAbbiamo ricevuto la tua richiesta per la creazione del sito web.\n\nLa tua anteprima sarà pronta in 5 giorni lavorativi. Ti invieremo un'email quando sarà pronta.\n\nIl pagamento sarà richiesto solo dopo aver approvato l'anteprima.\n\nHai domande? Contattaci: ${SUPPORT_EMAIL}\n\nGrazie per aver scelto WhiteBoar!`
      : `Hello ${businessName}!\n\nWe've received your website creation request.\n\nYour preview will be ready in 5 business days. We'll email you when it's ready for review.\n\nPayment will only be required after you approve the preview.\n\nQuestions? Contact us: ${SUPPORT_EMAIL}\n\nThank you for choosing WhiteBoar!`
  }

  private static generateAdminNotificationText(
    formData: OnboardingFormData,
    submissionId: string
  ): string {
    return `New Onboarding Submission\n\nBusiness: ${formData.businessName}\nEmail: ${formData.businessEmail}\nPhone: ${formData.businessPhone}\nIndustry: ${formData.industry}\nLocation: ${formData.businessCity || 'N/A'}, ${formData.businessProvince || 'N/A'}\n\nOffer: ${formData.businessDescription}\n\nView full submission: ${APP_URL}/admin/submissions/${submissionId}\n\nSubmission ID: ${submissionId}`
  }

  private static generatePreviewEmailHTML(
    businessName: string,
    previewUrl: string,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'La tua anteprima è pronta!',
      message: `Ciao ${businessName}! La tua anteprima personalizzata è pronta per la revisione.`,
      cta: 'Visualizza Anteprima',
      instructions: 'Clicca il pulsante sopra per vedere la tua nuova identità digitale. Se ti piace, potrai procedere con il pagamento per pubblicarla.',
      satisfaction: 'Non soddisfatto? Nessun problema - non paghi nulla.',
    } : {
      title: 'Your preview is ready!',
      message: `Hello ${businessName}! Your custom preview is ready for review.`,
      cta: 'View Preview',
      instructions: 'Click the button above to see your new digital identity. If you love it, you can proceed with payment to publish it.',
      satisfaction: 'Not satisfied? No problem - you don\'t pay anything.',
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 40px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div class="content">
              <p style="font-size: 18px;">${content.message}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${previewUrl}" class="button">${content.cta}</a>
              </div>
              <p>${content.instructions}</p>
              <p style="color: #059669;"><strong>${content.satisfaction}</strong></p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generatePreviewEmailText(
    businessName: string,
    previewUrl: string,
    locale: Locale
  ): string {
    return locale === 'it'
      ? `Ciao ${businessName}!\n\nLa tua anteprima è pronta: ${previewUrl}\n\nSe ti piace, potrai procedere con il pagamento. Se non sei soddisfatto, non paghi nulla.\n\nGrazie!`
      : `Hello ${businessName}!\n\nYour preview is ready: ${previewUrl}\n\nIf you love it, you can proceed with payment. If not satisfied, you don't pay anything.\n\nThanks!`
  }

  private static generateRecoveryEmailHTML(
    name: string,
    recoveryUrl: string,
    currentStep: number,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Non perdere la tua creazione',
      message: `Ciao ${name}, hai iniziato a creare il tuo sito web WhiteBoar ma non hai completato il processo.`,
      progress: `Sei arrivato al passo ${currentStep} di 12.`,
      cta: 'Continua la Creazione',
      urgency: 'La tua sessione scadrà presto. Completa ora per non perdere i tuoi progressi.'
    } : {
      title: 'Don\'t lose your creation',
      message: `Hello ${name}, you started creating your WhiteBoar website but haven\'t finished the process.`,
      progress: `You made it to step ${currentStep} of 12.`,
      cta: 'Continue Creating',
      urgency: 'Your session will expire soon. Complete now to avoid losing your progress.'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 40px; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div class="content">
              <p>${content.message}</p>
              <p><strong>${content.progress}</strong></p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${recoveryUrl}" class="button">${content.cta}</a>
              </div>
              <p style="color: #dc2626;"><em>${content.urgency}</em></p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateRecoveryEmailText(
    name: string,
    recoveryUrl: string,
    currentStep: number,
    locale: Locale
  ): string {
    return locale === 'it'
      ? `Ciao ${name},\n\nHai iniziato a creare il tuo sito WhiteBoar ma non hai completato il processo. Sei arrivato al passo ${currentStep} di 12.\n\nContinua qui: ${recoveryUrl}\n\nLa tua sessione scadrà presto - completa ora per non perdere i progressi!`
      : `Hello ${name},\n\nYou started creating your WhiteBoar website but haven't finished. You made it to step ${currentStep} of 12.\n\nContinue here: ${recoveryUrl}\n\nYour session will expire soon - complete now to avoid losing progress!`
  }

  // ===========================================================================
  // CUSTOM SOFTWARE INQUIRY EMAILS
  // ===========================================================================

  /**
   * Send payment notification to admin
   */
  static async sendPaymentNotification(
    submissionId: string,
    businessName: string,
    email: string,
    amount: number,
    currency: string,
    stripePaymentId: string,
    additionalLanguages: string[] = []
  ): Promise<boolean> {
    try {
      const subject = `💳 Payment Received: ${businessName} - €${(amount / 100).toFixed(2)}`

      const htmlContent = this.generatePaymentNotificationHTML(
        submissionId,
        businessName,
        email,
        amount,
        currency,
        stripePaymentId,
        additionalLanguages
      )

      const textContent = this.generatePaymentNotificationText(
        submissionId,
        businessName,
        email,
        amount,
        currency,
        stripePaymentId,
        additionalLanguages
      )

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping payment notification email:', {
          to: ADMIN_EMAIL,
          subject,
          submissionId,
          businessName,
          amount
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'payment_notification' },
          { name: 'business_name', value: sanitizeTagValue(businessName) },
          { name: 'amount', value: amount.toString() }
        ]
      })

      if (error) {
        console.error('Failed to send payment notification:', error)
        return false
      }

      console.log('Payment notification sent:', data)
      return true
    } catch (error) {
      console.error('Send payment notification error:', error)
      return false
    }
  }

  /**
   * Send payment success confirmation to customer
   */
  static async sendPaymentSuccessConfirmation(
    email: string,
    businessName: string,
    amount: number,
    currency: string,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? 'Il tuo nuovo sito web è in arrivo'
        : locale === 'pl'
        ? 'Twoja nowa strona internetowa jest w drodze'
        : 'Your new website is on its way'

      const htmlContent = this.generatePaymentSuccessHTML(
        businessName,
        amount,
        currency,
        locale
      )

      const textContent = this.generatePaymentSuccessText(
        businessName,
        amount,
        currency,
        locale
      )

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping payment success confirmation email:', {
          to: email,
          subject,
          businessName,
          amount
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'payment_success' },
          { name: 'locale', value: locale },
          { name: 'business_name', value: sanitizeTagValue(businessName) }
        ]
      })

      if (error) {
        console.error('Failed to send payment success confirmation:', error)
        return false
      }

      console.log('Payment success confirmation sent:', data)
      return true
    } catch (error) {
      console.error('Send payment success confirmation error:', error)
      return false
    }
  }

  /**
   * Send cancellation confirmation to customer
   */
  static async sendCancellationConfirmation(
    email: string,
    businessName: string,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? 'Il tuo abbonamento è stato cancellato'
        : locale === 'pl'
        ? 'Twoja subskrypcja zostala anulowana'
        : 'Your subscription has been cancelled'

      const htmlContent = this.generateCancellationConfirmationHTML(
        businessName,
        locale
      )

      const textContent = this.generateCancellationConfirmationText(
        businessName,
        locale
      )

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping cancellation confirmation email:', {
          to: email,
          subject,
          businessName
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'cancellation_confirmation' },
          { name: 'locale', value: locale },
          { name: 'business_name', value: sanitizeTagValue(businessName) }
        ]
      })

      if (error) {
        console.error('Failed to send cancellation confirmation:', error)
        return false
      }

      console.log('Cancellation confirmation sent:', data)
      return true
    } catch (error) {
      console.error('Send cancellation confirmation error:', error)
      return false
    }
  }

  /**
   * Send cancellation notification to admin
   */
  static async sendCancellationNotification(
    submissionId: string,
    businessName: string,
    email: string,
    subscriptionId: string,
    cancelledAt: number
  ): Promise<boolean> {
    try {
      const subject = `⚠️ Subscription Cancelled: ${businessName}`

      const htmlContent = this.generateCancellationNotificationHTML(
        submissionId,
        businessName,
        email,
        subscriptionId,
        cancelledAt
      )

      const textContent = this.generateCancellationNotificationText(
        submissionId,
        businessName,
        email,
        subscriptionId,
        cancelledAt
      )

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping cancellation notification email:', {
          to: ADMIN_EMAIL,
          subject,
          submissionId,
          businessName
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'cancellation_notification' },
          { name: 'business_name', value: sanitizeTagValue(businessName) }
        ]
      })

      if (error) {
        console.error('Failed to send cancellation notification:', error)
        return false
      }

      console.log('Cancellation notification sent:', data)
      return true
    } catch (error) {
      console.error('Send cancellation notification error:', error)
      return false
    }
  }

  /**
   * Send custom software inquiry notification to admin
   */
  static async sendCustomSoftwareInquiry(
    formData: CustomSoftwareFormData,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? `Nuova Richiesta Software Personalizzato: ${formData.name}`
        : locale === 'pl'
        ? `Nowe zapytanie o oprogramowanie: ${formData.name}`
        : `New Custom Software Inquiry: ${formData.name}`

      const htmlContent = this.generateCustomSoftwareInquiryHTML(formData, locale)
      const textContent = this.generateCustomSoftwareInquiryText(formData, locale)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping custom software inquiry email:', {
          to: ADMIN_EMAIL,
          subject,
          customerName: formData.name
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'custom_software_inquiry' },
          { name: 'locale', value: locale }
        ]
      })

      if (error) {
        console.error('Failed to send custom software inquiry:', error)
        return false
      }

      console.log('Custom software inquiry sent:', data)
      return true
    } catch (error) {
      console.error('Send custom software inquiry error:', error)
      return false
    }
  }

  /**
   * Send contact inquiry notification to admin
   */
  static async sendContactInquiry(
    formData: ContactFormData,
    locale: Locale = 'en'
  ): Promise<boolean> {
    try {
      const subject = locale === 'it'
        ? `Nuovo Messaggio di Contatto: ${formData.name}`
        : locale === 'pl'
        ? `Nowa wiadomosc kontaktowa: ${formData.name}`
        : `New Contact Message: ${formData.name}`

      const htmlContent = this.generateContactInquiryHTML(formData, locale)
      const textContent = this.generateContactInquiryText(formData, locale)

      // Skip sending emails in test mode
      if (IS_TEST_MODE) {
        console.log('[TEST MODE] Skipping contact inquiry email:', {
          to: ADMIN_EMAIL,
          subject,
          customerName: formData.name
        })
        return true
      }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject,
        html: htmlContent,
        text: textContent,
        tags: [
          { name: 'category', value: 'contact_inquiry' },
          { name: 'locale', value: locale }
        ]
      })

      if (error) {
        console.error('Failed to send contact inquiry:', error)
        return false
      }

      console.log('Contact inquiry sent:', data)
      return true
    } catch (error) {
      console.error('Send contact inquiry error:', error)
      return false
    }
  }

  private static generatePaymentNotificationHTML(
    submissionId: string,
    businessName: string,
    email: string,
    amount: number,
    currency: string,
    stripePaymentId: string,
    additionalLanguages: string[]
  ): string {
    const adminUrl = `${APP_URL}/admin/submissions/${submissionId}`
    const stripeUrl = `https://dashboard.stripe.com/payments/${stripePaymentId}`
    const formattedAmount = (amount / 100).toFixed(2)

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 30px; }
            .success-badge { background: #d1fae5; color: #065f46; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; }
            .info-label { font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .info-value { color: #1f2937; font-size: 16px; }
            .amount-box { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .amount-label { font-size: 14px; opacity: 0.9; margin-bottom: 5px; }
            .amount-value { font-size: 36px; font-weight: bold; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
            .button-stripe { background: #635bff; }
            .languages-list { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader('en')}
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">💳 Payment Received!</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">A customer has successfully completed payment</p>
            </div>
            <div class="content">
              <div class="success-badge">✓ PAYMENT SUCCESSFUL</div>

              <div class="amount-box">
                <div class="amount-label">Total Amount</div>
                <div class="amount-value">€${formattedAmount}</div>
                <div class="amount-label" style="margin-top: 5px;">${currency}</div>
              </div>

              <h2 style="color: #1f2937; margin-top: 30px;">Customer Details</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Business Name</div>
                  <div class="info-value">${businessName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="info-item">
                  <div class="info-label">Submission ID</div>
                  <div class="info-value" style="font-size: 12px; font-family: monospace;">${submissionId}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Stripe Payment ID</div>
                  <div class="info-value" style="font-size: 12px; font-family: monospace;">${stripePaymentId}</div>
                </div>
              </div>

              ${additionalLanguages.length > 0 ? `
                <div class="languages-list">
                  <strong>📦 Language Add-ons (${additionalLanguages.length}):</strong><br>
                  ${additionalLanguages.map(lang => `• ${lang.toUpperCase()}`).join('<br>')}
                </div>
              ` : ''}

              <h2 style="color: #1f2937; margin-top: 30px;">Next Steps</h2>
              <ol>
                <li>Review the complete submission in the admin panel</li>
                <li>Verify payment in Stripe dashboard</li>
                <li>Begin website creation process</li>
                <li>Schedule preview delivery (5 business days)</li>
              </ol>

              <p style="text-align: center; margin-top: 30px;">
                <a href="${adminUrl}" class="button">View Submission</a>
                <a href="${stripeUrl}" class="button button-stripe">View in Stripe</a>
              </p>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                Payment received at ${new Date().toLocaleString('en-US')}
              </p>
            </div>
            ${this.generateEmailFooter('en')}
          </div>
        </body>
      </html>
    `
  }

  private static generatePaymentNotificationText(
    submissionId: string,
    businessName: string,
    email: string,
    amount: number,
    currency: string,
    stripePaymentId: string,
    additionalLanguages: string[]
  ): string {
    const formattedAmount = (amount / 100).toFixed(2)
    const adminUrl = `${APP_URL}/admin/submissions/${submissionId}`
    const stripeUrl = `https://dashboard.stripe.com/payments/${stripePaymentId}`

    return `
💳 PAYMENT RECEIVED
${'='.repeat(50)}

✓ PAYMENT SUCCESSFUL

Total Amount: €${formattedAmount} ${currency}

CUSTOMER DETAILS:
Business Name: ${businessName}
Email: ${email}
Submission ID: ${submissionId}
Stripe Payment ID: ${stripePaymentId}

${additionalLanguages.length > 0 ? `
📦 LANGUAGE ADD-ONS (${additionalLanguages.length}):
${additionalLanguages.map(lang => `• ${lang.toUpperCase()}`).join('\n')}
` : ''}

NEXT STEPS:
1. Review the complete submission in the admin panel
2. Verify payment in Stripe dashboard
3. Begin website creation process
4. Schedule preview delivery (5 business days)

View Submission: ${adminUrl}
View in Stripe: ${stripeUrl}

---
WhiteBoar Admin Panel
Payment received at ${new Date().toLocaleString('en-US')}
    `.trim()
  }

  private static generatePaymentSuccessHTML(
    businessName: string,
    amount: number,
    currency: string,
    locale: Locale
  ): string {
    const formattedAmount = (amount / 100).toFixed(2)
    const shareUrl = encodeURIComponent(APP_URL)
    const shareText = encodeURIComponent(locale === 'it'
      ? 'Ho appena creato il mio sito web con WhiteBoar! Dai un\'occhiata 👉'
      : 'I just created my website with WhiteBoar! Check it out 👉')

    const content = locale === 'it' ? {
      subject: 'Il tuo nuovo sito web è in arrivo',
      header: 'Congratulazioni — il tuo viaggio inizia ora',
      greeting: `Ciao ${businessName}!`,
      intro: 'Hai appena fatto il passo più intelligente per mettere la tua azienda sulla mappa. Il tuo onboarding è completo, il pagamento è confermato e stiamo iniziando a lavorare sul tuo sito web.',
      nextDaysTitle: 'Nei prossimi giorni, il nostro team:',
      step1: 'Creerà la tua identità di marca — logo, colori e tipografia che ti fanno risaltare.',
      step2: 'Costruirà il tuo sito web personalizzato — multilingue, mobile-ready e ottimizzato per i motori di ricerca.',
      step3: 'Ti invierà un link di anteprima — così potrai revisionare e richiedere modifiche prima del lancio.',
      noAction: 'Non devi muovere un dito. La tua azienda avrà presto una presenza online audace — costruita per crescere, pronta per partire.',
      shareTitle: 'Aiuta i tuoi amici a mettere online le loro attività',
      shareFacebook: 'Condividi su Facebook',
      shareInstagram: 'Condividi su Instagram',
      shareX: 'Condividi su X',
      shareLinkedIn: 'Condividi su LinkedIn',
      shareWhatsApp: 'Condividi su WhatsApp',
      shareEmail: 'Condividi via email',
      footerTagline: 'WhiteBoar — Grande presenza per piccole imprese',
      footerQuestions: 'Domande? Contattaci in qualsiasi momento a'
    } : {
      subject: 'Your new website is on its way',
      header: 'Congratulations — your journey starts now',
      greeting: `Hello ${businessName}!`,
      intro: 'You\'ve just taken the smartest step toward putting your business on the map. Your onboarding is complete, your payment confirmed, and we are starting work on your website.',
      nextDaysTitle: 'Over the next few days, our team will:',
      step1: 'Craft your brand identity — logo, colors, and typography that make you stand out.',
      step2: 'Build your custom website — multilingual, mobile-ready, and search-optimized.',
      step3: 'Send you a preview link — so you can review and request adjustments before launch.',
      noAction: 'You don\'t need to lift a finger. Your business will soon have a bold online presence — built to grow, ready to go.',
      shareTitle: 'Help your friends get their businesses online too',
      shareFacebook: 'Share on Facebook',
      shareInstagram: 'Share on Instagram',
      shareX: 'Share on X',
      shareLinkedIn: 'Share on LinkedIn',
      shareWhatsApp: 'Share on WhatsApp',
      shareEmail: 'Share via email',
      footerTagline: 'WhiteBoar — Big presence for small business',
      footerQuestions: 'Questions? Contact us anytime at'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .steps {
              background: #f0fdf4;
              border-left: 4px solid #10b981;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .steps h3 {
              margin-top: 0;
              color: #065f46;
            }
            .steps ol {
              margin: 15px 0;
              padding-left: 20px;
            }
            .steps li {
              margin: 10px 0;
              color: #047857;
            }
            .no-action {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
              font-size: 16px;
              color: #78350f;
            }
            .share-section {
              background: #eff6ff;
              padding: 30px;
              margin: 30px 0;
              border-radius: 8px;
              text-align: center;
            }
            .share-section h3 {
              color: #1e40af;
              margin-top: 0;
            }
            .share-buttons {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: center;
              margin-top: 20px;
            }
            .share-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 48px;
              height: 48px;
              text-decoration: none;
              border-radius: 50%;
              font-weight: 600;
              color: white;
              font-size: 20px;
              transition: opacity 0.2s;
            }
            .share-button:hover {
              opacity: 0.8;
            }
            .btn-facebook { background: #1877f2; }
            .btn-instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
            .btn-x { background: #000000; }
            .btn-linkedin { background: #0077b5; }
            .btn-whatsapp { background: #25d366; }
            .btn-email { background: #6b7280; }
            @media only screen and (max-width: 600px) {
              .share-buttons {
                gap: 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}

            <div class="content">
              <p style="font-size: 18px; margin-bottom: 20px;">${content.greeting}</p>

              <p style="font-size: 16px;">${content.intro}</p>

              <div class="steps">
                <h3>${content.nextDaysTitle}</h3>
                <ol>
                  <li>${content.step1}</li>
                  <li>${content.step2}</li>
                  <li>${content.step3}</li>
                </ol>
              </div>

              <div class="no-action">
                <strong>${content.noAction}</strong>
              </div>

              <div class="share-section">
                <h3>${content.shareTitle}</h3>
                <div class="share-buttons">
                  <a href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" class="share-button btn-facebook" target="_blank" title="${content.shareFacebook}">f</a>
                  <a href="https://www.instagram.com/" class="share-button btn-instagram" target="_blank" title="${content.shareInstagram}">📷</a>
                  <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" class="share-button btn-x" target="_blank" title="${content.shareX}">𝕏</a>
                  <a href="https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}" class="share-button btn-linkedin" target="_blank" title="${content.shareLinkedIn}">in</a>
                  <a href="https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}" class="share-button btn-whatsapp" target="_blank" title="${content.shareWhatsApp}">💬</a>
                  <a href="mailto:?subject=${shareText}&body=${shareUrl}" class="share-button btn-email" title="${content.shareEmail}">✉️</a>
                </div>
              </div>
            </div>

            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generatePaymentSuccessText(
    businessName: string,
    amount: number,
    currency: string,
    locale: Locale
  ): string {
    const formattedAmount = (amount / 100).toFixed(2)
    const shareUrl = APP_URL

    const content = locale === 'it' ? {
      header: 'CONGRATULAZIONI — IL TUO VIAGGIO INIZIA ORA',
      greeting: `Ciao ${businessName}!`,
      intro: 'Hai appena fatto il passo più intelligente per mettere la tua azienda sulla mappa. Il tuo onboarding è completo, il pagamento è confermato e stiamo iniziando a lavorare sul tuo sito web.',
      nextDays: 'NEI PROSSIMI GIORNI, IL NOSTRO TEAM:',
      step1: '1. Creerà la tua identità di marca — logo, colori e tipografia che ti fanno risaltare.',
      step2: '2. Costruirà il tuo sito web personalizzato — multilingue, mobile-ready e ottimizzato per i motori di ricerca.',
      step3: '3. Ti invierà un link di anteprima — così potrai revisionare e richiedere modifiche prima del lancio.',
      noAction: 'Non devi muovere un dito. La tua azienda avrà presto una presenza online audace — costruita per crescere, pronta per partire.',
      share: 'Aiuta i tuoi amici a mettere online le loro attività: ' + shareUrl,
      footerTagline: 'WhiteBoar — Grande presenza per piccole imprese',
      footerQuestions: 'Domande? Contattaci in qualsiasi momento a ' + SUPPORT_EMAIL
    } : {
      header: 'CONGRATULATIONS — YOUR JOURNEY STARTS NOW',
      greeting: `Hello ${businessName}!`,
      intro: 'You\'ve just taken the smartest step toward putting your business on the map. Your onboarding is complete, your payment confirmed, and we are starting work on your website.',
      nextDays: 'OVER THE NEXT FEW DAYS, OUR TEAM WILL:',
      step1: '1. Craft your brand identity — logo, colors, and typography that make you stand out.',
      step2: '2. Build your custom website — multilingual, mobile-ready, and search-optimized.',
      step3: '3. Send you a preview link — so you can review and request adjustments before launch.',
      noAction: 'You don\'t need to lift a finger. Your business will soon have a bold online presence — built to grow, ready to go.',
      share: 'Help your friends get their businesses online too: ' + shareUrl,
      footerTagline: 'WhiteBoar — Big presence for small business',
      footerQuestions: 'Questions? Contact us anytime at ' + SUPPORT_EMAIL
    }

    return `
${content.header}
${'='.repeat(60)}

${content.greeting}

${content.intro}

${content.nextDays}

${content.step1}
${content.step2}
${content.step3}

${content.noAction}

---

${content.share}

---

${content.footerTagline}
${content.footerQuestions}

${APP_URL}
    `.trim()
  }

  private static generateCustomSoftwareInquiryHTML(
    formData: CustomSoftwareFormData,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Nuova Richiesta Software Personalizzato',
      intro: 'È stata ricevuta una nuova richiesta per un progetto software personalizzato!',
      contactInfo: 'Informazioni di Contatto',
      projectDetails: 'Dettagli del Progetto',
      nextSteps: 'Prossimi Passi',
      step1: 'Rivedi i dettagli del progetto qui sotto',
      step2: 'Contatta il cliente entro 2 giorni lavorativi',
      step3: 'Pianifica una chiamata di scoperta',
      footer: 'WhiteBoar - Sistema Notifiche'
    } : {
      title: 'New Custom Software Inquiry',
      intro: 'A new custom software project inquiry has been received!',
      contactInfo: 'Contact Information',
      projectDetails: 'Project Details',
      nextSteps: 'Next Steps',
      step1: 'Review the project details below',
      step2: 'Contact the client within 2 business days',
      step3: 'Schedule a discovery call',
      footer: 'WhiteBoar - Notification System'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #6366f1; }
            .info-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
            .info-value { color: #1f2937; }
            .description-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .steps { background: #eff6ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
            .steps ol { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🚀 ${content.title}</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">${content.intro}</p>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">${content.contactInfo}</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Name</div>
                  <div class="info-value">${formData.name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="info-item">
                  <div class="info-label">Phone</div>
                  <div class="info-value"><a href="tel:${formData.phone}">${formData.phone}</a></div>
                </div>
              </div>

              <h2 style="color: #1f2937; margin-top: 30px;">${content.projectDetails}</h2>
              <div class="description-box">
                <div style="white-space: pre-wrap;">${formData.description}</div>
              </div>

              <div class="steps">
                <h3 style="color: #1f2937; margin-top: 0;">${content.nextSteps}</h3>
                <ol>
                  <li>${content.step1}</li>
                  <li>${content.step2}</li>
                  <li>${content.step3}</li>
                </ol>
              </div>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                ${content.footer}<br>
                ${new Date().toLocaleString(locale === 'it' ? 'it-IT' : 'en-US')}
              </p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateCustomSoftwareInquiryText(
    formData: CustomSoftwareFormData,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Nuova Richiesta Software Personalizzato',
      intro: 'È stata ricevuta una nuova richiesta per un progetto software personalizzato!',
      contact: 'INFORMAZIONI DI CONTATTO',
      project: 'DETTAGLI DEL PROGETTO',
      nextSteps: 'PROSSIMI PASSI',
      step1: '1. Rivedi i dettagli del progetto',
      step2: '2. Contatta il cliente entro 2 giorni lavorativi',
      step3: '3. Pianifica una chiamata di scoperta'
    } : {
      title: 'New Custom Software Inquiry',
      intro: 'A new custom software project inquiry has been received!',
      contact: 'CONTACT INFORMATION',
      project: 'PROJECT DETAILS',
      nextSteps: 'NEXT STEPS',
      step1: '1. Review the project details',
      step2: '2. Contact the client within 2 business days',
      step3: '3. Schedule a discovery call'
    }

    return `
${content.title}
${'='.repeat(50)}

${content.intro}

${content.contact}:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

${content.project}:
${formData.description}

${content.nextSteps}:
${content.step1}
${content.step2}
${content.step3}

---
WhiteBoar - Notification System
${new Date().toLocaleString(locale === 'it' ? 'it-IT' : 'en-US')}
    `.trim()
  }

  private static generateContactInquiryHTML(
    formData: ContactFormData,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Nuovo Messaggio di Contatto',
      intro: 'È stato ricevuto un nuovo messaggio dalla pagina contatti!',
      contactInfo: 'Informazioni di Contatto',
      messageDetails: 'Dettagli del Messaggio',
      nextSteps: 'Prossimi Passi',
      step1: 'Rivedi i dettagli del messaggio qui sotto',
      step2: 'Contatta la persona entro 2 giorni lavorativi',
      step3: 'Rispondi alla sua richiesta',
      footer: 'WhiteBoar - Sistema Notifiche'
    } : {
      title: 'New Contact Message',
      intro: 'A new message has been received from the contact page!',
      contactInfo: 'Contact Information',
      messageDetails: 'Message Details',
      nextSteps: 'Next Steps',
      step1: 'Review the message details below',
      step2: 'Contact the person within 2 business days',
      step3: 'Respond to their inquiry',
      footer: 'WhiteBoar - Notification System'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 30px; }
            .info-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #3b82f6; }
            .info-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
            .info-value { color: #1f2937; }
            .details-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .steps { background: #eff6ff; padding: 20px; border-radius: 4px; margin: 20px 0; }
            .steps ol { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📧 ${content.title}</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">${content.intro}</p>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-top: 0;">${content.contactInfo}</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Name</div>
                  <div class="info-value">${formData.name}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value"><a href="mailto:${formData.email}">${formData.email}</a></div>
                </div>
                <div class="info-item">
                  <div class="info-label">Phone</div>
                  <div class="info-value"><a href="tel:${formData.phone}">${formData.phone}</a></div>
                </div>
              </div>

              <h2 style="color: #1f2937; margin-top: 30px;">${content.messageDetails}</h2>
              <div class="details-box">
                <div style="white-space: pre-wrap;">${formData.details}</div>
              </div>

              <div class="steps">
                <h3 style="color: #1f2937; margin-top: 0;">${content.nextSteps}</h3>
                <ol>
                  <li>${content.step1}</li>
                  <li>${content.step2}</li>
                  <li>${content.step3}</li>
                </ol>
              </div>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                ${content.footer}<br>
                ${new Date().toLocaleString(locale === 'it' ? 'it-IT' : 'en-US')}
              </p>
            </div>
            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateContactInquiryText(
    formData: ContactFormData,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Nuovo Messaggio di Contatto',
      intro: 'È stato ricevuto un nuovo messaggio dalla pagina contatti!',
      contact: 'INFORMAZIONI DI CONTATTO',
      message: 'DETTAGLI DEL MESSAGGIO',
      nextSteps: 'PROSSIMI PASSI',
      step1: '1. Rivedi i dettagli del messaggio',
      step2: '2. Contatta la persona entro 2 giorni lavorativi',
      step3: '3. Rispondi alla sua richiesta'
    } : {
      title: 'New Contact Message',
      intro: 'A new message has been received from the contact page!',
      contact: 'CONTACT INFORMATION',
      message: 'MESSAGE DETAILS',
      nextSteps: 'NEXT STEPS',
      step1: '1. Review the message details',
      step2: '2. Contact the person within 2 business days',
      step3: '3. Respond to their inquiry'
    }

    return `
${content.title}
${'='.repeat(50)}

${content.intro}

${content.contact}:
Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone}

${content.message}:
${formData.details}

${content.nextSteps}:
${content.step1}
${content.step2}
${content.step3}

----
WhiteBoar - Notification System
${new Date().toLocaleString(locale === 'it' ? 'it-IT' : 'en-US')}
    `.trim()
  }

  private static generateCancellationConfirmationHTML(
    businessName: string,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      title: 'Abbonamento Cancellato',
      header: 'Il tuo abbonamento è stato cancellato',
      greeting: `Ciao ${businessName},`,
      intro: 'Ci dispiace vederti andare via. Il tuo abbonamento WhiteBoar è stato cancellato con successo.',
      whatHappens: 'Cosa succede ora:',
      point1: 'Il tuo abbonamento rimarrà attivo fino alla fine del periodo di fatturazione corrente.',
      point2: 'Non riceverai ulteriori addebiti da WhiteBoar.',
      point3: 'Puoi continuare ad accedere ai tuoi servizi fino alla fine del periodo di fatturazione.',
      feedback: 'Ci piacerebbe sapere perché hai deciso di cancellare. Il tuo feedback ci aiuta a migliorare i nostri servizi.',
      reactivate: 'Se cambi idea, puoi sempre riattivare il tuo abbonamento contattandoci.',
      thanks: 'Grazie per aver utilizzato WhiteBoar.',
      contactUs: 'Contattaci',
      footerTagline: 'WhiteBoar — Grande presenza per piccole imprese',
      footerQuestions: 'Domande? Contattaci in qualsiasi momento a'
    } : {
      title: 'Subscription Cancelled',
      header: 'Your subscription has been cancelled',
      greeting: `Hello ${businessName},`,
      intro: 'We\'re sorry to see you go. Your WhiteBoar subscription has been successfully cancelled.',
      whatHappens: 'What happens now:',
      point1: 'Your subscription will remain active until the end of your current billing period.',
      point2: 'You won\'t be charged again by WhiteBoar.',
      point3: 'You can continue to access your services until the end of the billing period.',
      feedback: 'We\'d love to know why you decided to cancel. Your feedback helps us improve our services.',
      reactivate: 'If you change your mind, you can always reactivate your subscription by contacting us.',
      thanks: 'Thank you for using WhiteBoar.',
      contactUs: 'Contact Us',
      footerTagline: 'WhiteBoar — Big presence for small business',
      footerQuestions: 'Questions? Contact us anytime at'
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .info-box {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .info-box h3 {
              margin-top: 0;
              color: #991b1b;
            }
            .info-box ul {
              margin: 15px 0;
              padding-left: 20px;
            }
            .info-box li {
              margin: 10px 0;
              color: #7f1d1d;
            }
            .feedback-box {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 25px 0;
              border-radius: 4px;
            }
            .button {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 4px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader(locale)}

            <div class="content">
              <p style="font-size: 18px; margin-bottom: 20px;">${content.greeting}</p>

              <p style="font-size: 16px;">${content.intro}</p>

              <div class="info-box">
                <h3>${content.whatHappens}</h3>
                <ul>
                  <li>${content.point1}</li>
                  <li>${content.point2}</li>
                  <li>${content.point3}</li>
                </ul>
              </div>

              <div class="feedback-box">
                <p>${content.feedback}</p>
                <p>${content.reactivate}</p>
              </div>

              <p style="text-align: center;">
                <a href="mailto:${SUPPORT_EMAIL}" class="button">${content.contactUs}</a>
              </p>

              <p style="font-size: 16px; margin-top: 30px;">${content.thanks}</p>
            </div>

            ${this.generateEmailFooter(locale)}
          </div>
        </body>
      </html>
    `
  }

  private static generateCancellationConfirmationText(
    businessName: string,
    locale: Locale
  ): string {
    const content = locale === 'it' ? {
      header: 'IL TUO ABBONAMENTO È STATO CANCELLATO',
      greeting: `Ciao ${businessName},`,
      intro: 'Ci dispiace vederti andare via. Il tuo abbonamento WhiteBoar è stato cancellato con successo.',
      whatHappens: 'COSA SUCCEDE ORA:',
      point1: '• Il tuo abbonamento rimarrà attivo fino alla fine del periodo di fatturazione corrente.',
      point2: '• Non riceverai ulteriori addebiti da WhiteBoar.',
      point3: '• Puoi continuare ad accedere ai tuoi servizi fino alla fine del periodo di fatturazione.',
      feedback: 'Ci piacerebbe sapere perché hai deciso di cancellare. Il tuo feedback ci aiuta a migliorare i nostri servizi.',
      reactivate: 'Se cambi idea, puoi sempre riattivare il tuo abbonamento contattandoci.',
      thanks: 'Grazie per aver utilizzato WhiteBoar.',
      contact: 'Contattaci: ' + SUPPORT_EMAIL,
      footerTagline: 'WhiteBoar — Grande presenza per piccole imprese'
    } : {
      header: 'YOUR SUBSCRIPTION HAS BEEN CANCELLED',
      greeting: `Hello ${businessName},`,
      intro: 'We\'re sorry to see you go. Your WhiteBoar subscription has been successfully cancelled.',
      whatHappens: 'WHAT HAPPENS NOW:',
      point1: '• Your subscription will remain active until the end of your current billing period.',
      point2: '• You won\'t be charged again by WhiteBoar.',
      point3: '• You can continue to access your services until the end of the billing period.',
      feedback: 'We\'d love to know why you decided to cancel. Your feedback helps us improve our services.',
      reactivate: 'If you change your mind, you can always reactivate your subscription by contacting us.',
      thanks: 'Thank you for using WhiteBoar.',
      contact: 'Contact us: ' + SUPPORT_EMAIL,
      footerTagline: 'WhiteBoar — Big presence for small business'
    }

    return `
${content.header}
${'='.repeat(60)}

${content.greeting}

${content.intro}

${content.whatHappens}

${content.point1}
${content.point2}
${content.point3}

${content.feedback}

${content.reactivate}

${content.thanks}

---

${content.contact}

${content.footerTagline}
${APP_URL}
    `.trim()
  }

  private static generateCancellationNotificationHTML(
    submissionId: string,
    businessName: string,
    email: string,
    subscriptionId: string,
    cancelledAt: number
  ): string {
    const adminUrl = `${APP_URL}/admin/submissions/${submissionId}`
    const stripeUrl = `https://dashboard.stripe.com/subscriptions/${subscriptionId}`
    const cancelledDate = new Date(cancelledAt * 1000).toLocaleString('en-US')

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Subscription Cancelled</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .content { padding: 30px; }
            .warning-badge { background: #fef2f2; color: #991b1b; padding: 10px 20px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; border: 2px solid #ef4444; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
            .info-item { background: #f8f9fa; padding: 15px; border-radius: 4px; }
            .info-label { font-weight: bold; color: #374151; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .info-value { color: #1f2937; font-size: 16px; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 5px; }
            .button-stripe { background: #635bff; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.generateEmailHeader('en')}
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">⚠️ Subscription Cancelled</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">A customer has cancelled their subscription</p>
            </div>
            <div class="content">
              <div class="warning-badge">SUBSCRIPTION CANCELLED</div>

              <h2 style="color: #1f2937; margin-top: 30px;">Customer Details</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">Business Name</div>
                  <div class="info-value">${businessName}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Email</div>
                  <div class="info-value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="info-item">
                  <div class="info-label">Submission ID</div>
                  <div class="info-value" style="font-size: 12px; font-family: monospace;">${submissionId}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Subscription ID</div>
                  <div class="info-value" style="font-size: 12px; font-family: monospace;">${subscriptionId}</div>
                </div>
                <div class="info-item">
                  <div class="info-label">Cancelled At</div>
                  <div class="info-value">${cancelledDate}</div>
                </div>
              </div>

              <h2 style="color: #1f2937; margin-top: 30px;">Recommended Actions</h2>
              <ol>
                <li>Review the customer's submission details</li>
                <li>Consider reaching out to understand why they cancelled</li>
                <li>Update any internal records or project status</li>
                <li>Verify cancellation in Stripe dashboard</li>
              </ol>

              <p style="text-align: center; margin-top: 30px;">
                <a href="${adminUrl}" class="button">View Submission</a>
                <a href="${stripeUrl}" class="button button-stripe">View in Stripe</a>
              </p>

              <p style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
                WhiteBoar Admin Panel<br>
                Cancellation processed at ${new Date().toLocaleString('en-US')}
              </p>
            </div>
            ${this.generateEmailFooter('en')}
          </div>
        </body>
      </html>
    `
  }

  private static generateCancellationNotificationText(
    submissionId: string,
    businessName: string,
    email: string,
    subscriptionId: string,
    cancelledAt: number
  ): string {
    const adminUrl = `${APP_URL}/admin/submissions/${submissionId}`
    const stripeUrl = `https://dashboard.stripe.com/subscriptions/${subscriptionId}`
    const cancelledDate = new Date(cancelledAt * 1000).toLocaleString('en-US')

    return `
⚠️ SUBSCRIPTION CANCELLED
${'='.repeat(50)}

SUBSCRIPTION CANCELLED

CUSTOMER DETAILS:
Business Name: ${businessName}
Email: ${email}
Submission ID: ${submissionId}
Subscription ID: ${subscriptionId}
Cancelled At: ${cancelledDate}

RECOMMENDED ACTIONS:
1. Review the customer's submission details
2. Consider reaching out to understand why they cancelled
3. Update any internal records or project status
4. Verify cancellation in Stripe dashboard

View Submission: ${adminUrl}
View in Stripe: ${stripeUrl}

---
WhiteBoar Admin Panel
Cancellation processed at ${new Date().toLocaleString('en-US')}
    `.trim()
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Send verification email (convenience wrapper)
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string,
  locale: Locale = 'en'
): Promise<boolean> {
  const result = await EmailService.sendVerificationEmail(email, name, code, locale)
  return result.success && result.data?.sent === true
}

/**
 * Send all completion notifications (user + admin)
 */
export async function sendCompletionNotifications(
  formData: OnboardingFormData,
  submissionId: string,
  locale: Locale = 'en'
): Promise<{ userNotified: boolean; adminNotified: boolean }> {
  const [userResult, adminResult] = await Promise.all([
    EmailService.sendCompletionConfirmation(formData.email, formData.businessName, locale),
    EmailService.sendAdminNotification(formData, submissionId)
  ])

  return {
    userNotified: userResult,
    adminNotified: adminResult
  }
}

/**
 * Check if Resend service is properly configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY || process.env.RESEND_KEY) && !!FROM_EMAIL
}

// EmailService is already exported as a class above
