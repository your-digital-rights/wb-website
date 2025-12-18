'use client'

import { useState } from 'react'
import { notFound } from 'next/navigation'
import { Locale } from '@/lib/i18n'

// Block access in production - this page is for development/testing only
if (process.env.NODE_ENV === 'production') {
  notFound()
}

const emailTypes = [
  { id: 'verification', name: 'Verification Email', description: 'Email with 6-digit verification code' },
  { id: 'completion', name: 'Completion Email', description: 'Confirmation after onboarding completion' },
  { id: 'admin', name: 'Admin Notification', description: 'New submission notification for admin' },
  { id: 'preview', name: 'Preview Email', description: 'Website preview is ready' },
  { id: 'recovery', name: 'Recovery Email', description: 'Abandoned onboarding recovery' },
  { id: 'payment-notification', name: 'Payment Notification (Admin)', description: 'Payment received notification for admin' },
  { id: 'payment-success', name: 'Payment Success', description: 'Payment confirmation for customer' },
  { id: 'custom-software', name: 'Custom Software Inquiry', description: 'Custom software form submission' },
  { id: 'contact', name: 'Contact Inquiry', description: 'Contact form submission' },
  { id: 'cancellation-confirmation', name: 'Cancellation Confirmation', description: 'Subscription cancelled confirmation' },
  { id: 'cancellation-notification', name: 'Cancellation Notification (Admin)', description: 'Cancellation notification for admin' },
]

export default function TestEmailsPage() {
  const [email, setEmail] = useState('')
  const [locale, setLocale] = useState<Locale>('en')
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const sendTestEmail = async (emailType: string) => {
    if (!email) {
      setMessage({ type: 'error', text: 'Please enter your email address first' })
      return
    }

    setLoading(emailType)
    setMessage(null)

    try {
      const response = await fetch('/api/test/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailType, toEmail: email, locale })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `${emailType} email sent successfully to ${email}!` })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error - make sure the dev server is running' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Email Template Tester
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Test all email templates with the new WhiteBoar logo
          </p>

          {/* Email Input */}
          <div className="mb-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="locale" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en">English</option>
                <option value="it">Italian</option>
                <option value="pl">Polish</option>
              </select>
            </div>
          </div>

          {/* Status Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Email Type Buttons */}
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Select Email to Test
            </h2>
            {emailTypes.map(({ id, name, description }) => (
              <button
                key={id}
                onClick={() => sendTestEmail(id)}
                disabled={loading === id || !email}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  loading === id
                    ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700'
                    : !email
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">{name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
                  </div>
                  {loading === id && (
                    <div className="ml-4">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-300">
              <li>Enter your email address above</li>
              <li>Select your preferred language (EN/IT)</li>
              <li>Click any button to send that email type</li>
              <li>Check your inbox to see the email with the new WhiteBoar logo</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
