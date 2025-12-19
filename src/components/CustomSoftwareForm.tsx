"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Loader2 } from "lucide-react"
import { CustomSoftwareFormData, CustomSoftwareFormErrors, CustomSoftwareFormState } from "@/types/custom-software"
import { fadeInUp } from "../../context/design-system/motion/variants"
import { trackGenerateLead } from "@/lib/analytics"
import { Locale } from "@/lib/i18n"

export function CustomSoftwareForm() {
  const t = useTranslations('customSoftware.form')
  const locale = useLocale() as Locale
  const shouldReduce = useReducedMotion()

  const variants = shouldReduce ? {} : {
    card: fadeInUp
  }

  const [formData, setFormData] = React.useState<CustomSoftwareFormData>({
    name: '',
    email: '',
    phone: '',
    description: ''
  })

  const [formState, setFormState] = React.useState<CustomSoftwareFormState>({
    isSubmitting: false,
    isSuccess: false,
    errors: {}
  })

  const validateField = (name: keyof CustomSoftwareFormData, value: string): string | undefined => {
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
      case 'description':
        if (!value.trim()) return t('errors.descriptionRequired')
        if (value.trim().length < 20) return t('errors.descriptionTooShort')
        break
    }
    return undefined
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error for this field
    if (formState.errors[name as keyof CustomSoftwareFormErrors]) {
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: undefined }
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const errors: CustomSoftwareFormErrors = {}
    Object.keys(formData).forEach((key) => {
      const fieldName = key as keyof CustomSoftwareFormData
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
      const response = await fetch('/api/custom-software/contact', {
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

      // Track lead generation event
      trackGenerateLead()

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        description: ''
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
              <h3 data-testid="custom-software-success-title" className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                {t('success.title')}
              </h3>
              <p data-testid="custom-software-success-message" className="text-green-800 dark:text-green-200">
                {t('success.message')}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={variants.card}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      className="max-w-2xl mx-auto"
    >
      <Card>
        <CardHeader>
          <CardTitle data-testid="custom-software-form-title" className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="description" className="required">
                {t('descriptionLabel')}
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={t('descriptionPlaceholder')}
                aria-invalid={!!formState.errors.description}
                aria-describedby={formState.errors.description ? 'description-error' : undefined}
                disabled={formState.isSubmitting}
                rows={6}
                required
              />
              {formState.errors.description && (
                <p id="description-error" className="text-sm text-destructive" role="alert">
                  {formState.errors.description}
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
              data-testid="custom-software-submit-btn"
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
  )
}
