# Contact Page - Email Configuration

## Overview
The contact page at `/contact` (EN) and `/it/contact` (IT) sends email notifications to the admin when a user submits the contact form.

## Email Service Configuration

### Environment Variables Required

The email service uses the following environment variables:

```bash
# Required: Resend API Key (get from https://resend.com)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Required: Admin email that receives contact form notifications
NOTIFICATION_ADMIN_EMAIL=admin@whiteboar.it

# Optional: Override the FROM email address
NOTIFICATION_FROM_EMAIL=noreply@notifications.whiteboar.it

# Optional: Override the FROM name
FROM_NAME=WhiteBoar

# Optional: Enable email sending in preview/development (default: disabled)
ENABLE_EMAILS=true
```

### Email Sending Behavior

**By default, emails are NOT sent in:**
- Development environment (`NODE_ENV=development`)
- Preview deployments (`VERCEL_ENV=preview`)
- Test environment (`NODE_ENV=test`)
- CI environment (`CI=true`)

**To enable email sending in these environments:**
Set the environment variable `ENABLE_EMAILS=true`

**Emails are always sent in:**
- Production environment (`NODE_ENV=production` and `VERCEL_ENV=production`)

### Testing Email Functionality

#### Option 1: Use Test Email Pattern
When testing, use an email address with `.test@` pattern (e.g., `test.test@example.com`).
This will:
- Skip actual email sending
- Log the email to console
- Still validate all form fields
- Show success message

#### Option 2: Enable Emails in Development
1. Create/update `.env.local`:
   ```bash
   ENABLE_EMAILS=true
   RESEND_API_KEY=your_actual_resend_key
   NOTIFICATION_ADMIN_EMAIL=your_email@example.com
   ```

2. Restart the development server:
   ```bash
   PORT=3783 pnpm dev
   ```

3. Submit the contact form with a real email

#### Option 3: Test in Production/Staging
Deploy to a production or staging environment where `NODE_ENV=production` is set, and emails will be sent automatically.

## Email Template

The admin receives an email with:
- **Subject**: "New Contact Message: [Name]" (EN) / "Nuovo Messaggio di Contatto: [Name]" (IT)
- **Content**:
  - Contact information (Name, Email, Phone)
  - Message details
  - Next steps reminder (respond within 2 business days)
- **Format**: Both HTML (styled) and plain text versions

## Troubleshooting

### Emails Not Being Sent

1. **Check Environment**
   - Verify you're in production or `ENABLE_EMAILS=true` is set
   - Check console logs for "[TEST MODE] Skipping contact inquiry email" message

2. **Verify Resend Configuration**
   - Ensure `RESEND_API_KEY` is set correctly
   - Check Resend dashboard for API key validity
   - Verify sending domain is configured in Resend

3. **Check Console Logs**
   - Look for "Contact inquiry sent:" (success) or "Failed to send contact inquiry:" (failure)
   - Check for Resend API errors in logs

4. **Verify Admin Email**
   - Ensure `NOTIFICATION_ADMIN_EMAIL` is set
   - Default is `admin@whiteboar.it` if not set

### Form Validation Errors

The form validates:
- **Name**: Required, minimum 2 characters
- **Email**: Required, valid email format
- **Phone**: Required, valid phone format (min 8 digits)
- **Details**: Required, minimum 15 characters

## API Endpoint

**Endpoint**: `POST /api/contact`

**Request Body**:
```json
{
  "formData": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+39 123 456 7890",
    "details": "I would like to inquire about your services..."
  },
  "locale": "en"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Thank you! We received your message and will get back to you within 2 business days."
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "error": "Error message",
  "errors": {
    "name": "Name is required",
    "email": "Please enter a valid email address"
  }
}
```

## Files

- **Component**: `src/components/ContactForm.tsx`
- **Page**: `src/app/[locale]/contact/page.tsx`
- **API**: `src/app/api/contact/route.ts`
- **Email Service**: `src/services/resend.ts` (sendContactInquiry method)
- **Types**: `src/types/contact.ts`
- **Translations**: `src/messages/en.json` and `src/messages/it.json`
