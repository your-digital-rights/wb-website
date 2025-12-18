"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2, Mail } from "lucide-react"
import { ContactFormData, ContactFormErrors, ContactFormState } from "@/types/contact"
import { fadeInUp } from "../../context/design-system/motion/variants"
import { Locale } from "@/lib/i18n"

export function ContactForm() {
  const t = useTranslations('contact.form')
  const tContact = useTranslations('contact')
  const locale = useLocale() as Locale
  const shouldReduce = useReducedMotion()

  const variants = shouldReduce ? {} : {
    card: fadeInUp
  }

  const [formData, setFormData] = React.useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    details: ''
  })

  const [formState, setFormState] = React.useState<ContactFormState>({
    isSubmitting: false,
    isSuccess: false,
    errors: {}
  })

  const validateField = (name: keyof ContactFormData, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return t('errors.nameRequired')
        if (value.trim().length < 2) return t('errors.nameTooShort')
        break
      case 'email':
        if (!value.trim()) return t('errors.emailRequired')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('errors.emailInvalid')
        break
      case 'phone':
        if (!value.trim()) return t('errors.phoneRequired')
        if (!/^[\d\s\-\+\(\)]+$/.test(value) || value.replace(/\D/g, '').length < 8) {
          return t('errors.phoneInvalid')
        }
        break
      case 'details':
        if (!value.trim()) return t('errors.detailsRequired')
        if (value.trim().length < 15) return t('errors.detailsTooShort')
        break
    }
    return undefined
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error for this field
    if (formState.errors[name as keyof ContactFormErrors]) {
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: undefined }
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const errors: ContactFormErrors = {}
    Object.keys(formData).forEach((key) => {
      const fieldName = key as keyof ContactFormData
      const error = validateField(fieldName, formData[fieldName])
      if (error) {
        errors[fieldName] = error
      }
    })

    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({ ...prev, errors }))
      return
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, errors: {} }))

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ formData, locale }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setFormState(prev => ({
          ...prev,
          isSubmitting: false,
          errors: data.errors || { submit: data.error || t('errors.submitFailed') }
        }))
        return
      }

      setFormState({
        isSubmitting: false,
        isSuccess: true,
        errors: {}
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        details: ''
      })

    } catch (error) {
      console.error('Form submission error:', error)
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: { submit: t('errors.submitFailed') }
      }))
    }
  }

  if (formState.isSuccess) {
    return (
      <motion.div
        variants={variants.card}
        initial="hidden"
        animate="show"
        className="max-w-2xl mx-auto"
      >
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-500 mx-auto mb-4" />
              <h3 data-testid="contact-success-title" className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                {t('success.title')}
              </h3>
              <p data-testid="contact-success-message" className="text-green-800 dark:text-green-200">
                {t('success.message')}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Welcome Message */}
      <motion.div
        variants={variants.card}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="mb-8 text-center"
      >
        <p className="text-lg text-gray-700 dark:text-gray-200 mb-4">
          {tContact('welcome')}
        </p>
        <div className="flex items-center justify-center gap-2 text-gray-700 dark:text-gray-200">
          <Mail className="w-5 h-5" />
          <span>{tContact('contactInfo')}</span>
          <a
            href="mailto:info@whiteboar.it"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            info@whiteboar.it
          </a>
        </div>
      </motion.div>

      {/* Contact Form */}
      <motion.div
        variants={variants.card}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <Card>
          <CardHeader>
            <CardTitle data-testid="contact-form-title" className="text-2xl">{t('title')}</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="required">
                  {t('nameLabel')}
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t('namePlaceholder')}
                  aria-invalid={!!formState.errors.name}
                  aria-describedby={formState.errors.name ? 'name-error' : undefined}
                  disabled={formState.isSubmitting}
                  required
                />
                {formState.errors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">
                    {formState.errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="required">
                  {t('emailLabel')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('emailPlaceholder')}
                  aria-invalid={!!formState.errors.email}
                  aria-describedby={formState.errors.email ? 'email-error' : undefined}
                  disabled={formState.isSubmitting}
                  required
                />
                {formState.errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">
                    {formState.errors.email}
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="required">
                  {t('phoneLabel')}
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('phonePlaceholder')}
                  aria-invalid={!!formState.errors.phone}
                  aria-describedby={formState.errors.phone ? 'phone-error' : undefined}
                  disabled={formState.isSubmitting}
                  required
                />
                {formState.errors.phone && (
                  <p id="phone-error" className="text-sm text-destructive" role="alert">
                    {formState.errors.phone}
                  </p>
                )}
              </div>

              {/* Details Field */}
              <div className="space-y-2">
                <Label htmlFor="details" className="required">
                  {t('detailsLabel')}
                </Label>
                <Textarea
                  id="details"
                  name="details"
                  value={formData.details}
                  onChange={handleChange}
                  placeholder={t('detailsPlaceholder')}
                  aria-invalid={!!formState.errors.details}
                  aria-describedby={formState.errors.details ? 'details-error' : undefined}
                  disabled={formState.isSubmitting}
                  rows={6}
                  required
                />
                {formState.errors.details && (
                  <p id="details-error" className="text-sm text-destructive" role="alert">
                    {formState.errors.details}
                  </p>
                )}
              </div>

              {/* Submit Error */}
              {formState.errors.submit && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4" role="alert">
                  <p className="text-sm text-destructive">{formState.errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                data-testid="contact-submit-btn"
                type="submit"
                disabled={formState.isSubmitting}
                className="w-full"
                size="lg"
              >
                {formState.isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submitButton')
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
