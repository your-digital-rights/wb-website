'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShoppingCart,
  Tag
} from 'lucide-react'
import {
  PaymentElement,
  Elements,
  ElementsConsumer
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { Appearance, Stripe, StripeElements, PaymentIntent, SetupIntent } from '@stripe/stripe-js'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { StepComponentProps } from './index'
import {
  EUROPEAN_LANGUAGES,
  getLanguageName
} from '@/data/european-languages'
import { trackPurchase } from '@/lib/analytics'
import { Locale } from '@/lib/i18n'
import { useOnboardingStore } from '@/stores/onboarding'

// Initialize Stripe
const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
const stripePromise = loadStripe(STRIPE_KEY)

interface CheckoutFormLineItem {
  id: string
  description: string
  amount: number
  originalAmount: number
  quantity: number
  discountAmount: number
  isRecurring: boolean
}

interface PricingSummary {
  subtotal: number
  total: number
  discountAmount: number
  recurringAmount: number
  recurringDiscount: number
  taxAmount: number
  currency: string
  lineItems: CheckoutFormLineItem[]
}

interface RefreshPaymentIntentResult {
  success: boolean
  summary?: PricingSummary
  appliedDiscountCode?: string | null
  errorCode?: string
  errorMessage?: string
}

interface DiscountVerificationResult {
  success: boolean
  errorMessage?: string
}

interface DiscountValidation {
  status: 'valid' | 'invalid'
  code?: string
  couponId?: string
  promotionCodeId?: string
  enteredCode?: string
  duration?: 'once' | 'forever' | 'repeating'
  durationInMonths?: number
  preview?: PricingSummary
  error?: string
}

interface CheckoutWrapperProps extends StepComponentProps {
  sessionId: string
  submissionId: string
}

interface CheckoutFormProps extends CheckoutWrapperProps {
  activeDiscountCode: string | null
  paymentRequired: boolean
  hasZeroPayment: boolean
  noPaymentDue: boolean
  clientSecret: string | null
  stripe: Stripe | null
  elements: StripeElements | null
  pricingSummary: PricingSummary | null
  discountValidation: DiscountValidation | null
  isVerifyingDiscount: boolean
  setDiscountValidation: (validation: DiscountValidation | null) => void
  onDiscountCleared: () => void
  onLanguagesChange: (languages: string[]) => void
  onZeroPaymentComplete: () => void
  onVerifyDiscount: (code: string) => Promise<DiscountVerificationResult>
}

function CheckoutForm({
  form,
  errors,
  isLoading,
  sessionId,
  submissionId,
  activeDiscountCode,
  paymentRequired,
  hasZeroPayment,
  noPaymentDue,
  clientSecret,
  stripe,
  elements,
  pricingSummary,
  discountValidation,
  isVerifyingDiscount,
  setDiscountValidation,
  onDiscountCleared,
  onLanguagesChange,
  onZeroPaymentComplete,
  onVerifyDiscount
}: CheckoutFormProps) {
  const t = useTranslations('onboarding.steps.14')
  const locale = useLocale() as Locale
  const { control, watch } = form
  const formData = useOnboardingStore(state => state.formData)

  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(!paymentRequired)
  const lastInstrumentedClientSecretRef = useRef<string | null>(null)
  const submitInFlightRef = useRef(false)
  const shouldExposeStripeDebug = typeof window !== 'undefined'
    && (process.env.NODE_ENV !== 'production' || window.location.hostname === 'localhost')

  // Discount validation state
  // Watch form values for reactive updates
  const acceptTerms = watch('acceptTerms') || false
  const selectedLanguages = watch('additionalLanguages') || []
  const discountCode = watch('discountCode') || ''

  const languagesRef = useRef('')
  const hasMountedRef = useRef(false)
  useEffect(() => {
    const sorted = Array.isArray(selectedLanguages)
      ? [...selectedLanguages].sort().join(',')
      : ''

    if (!hasMountedRef.current) {
      hasMountedRef.current = true
      languagesRef.current = sorted
      return
    }

    if (languagesRef.current === sorted) {
      return
    }

    languagesRef.current = sorted
    onLanguagesChange(Array.isArray(selectedLanguages) ? selectedLanguages : [])
  }, [selectedLanguages, onLanguagesChange])

  // ALL pricing from Stripe controller response
  const totalDueToday = pricingSummary ? pricingSummary.total / 100 : 0
  const discountAmount = pricingSummary ? pricingSummary.discountAmount / 100 : 0
  const recurringMonthlyPrice = pricingSummary ? pricingSummary.recurringAmount / 100 : 0
  const subtotal = pricingSummary ? pricingSummary.subtotal / 100 : 0
  const lineItems = pricingSummary?.lineItems || []

  const billingDetails = useMemo(() => {
    const normalize = (value?: string | null) => {
      if (typeof value !== 'string') {
        return undefined
      }
      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    }

    const firstName = normalize(formData?.firstName)
    const lastName = normalize(formData?.lastName)
    const nameFromProfile = normalize([firstName, lastName].filter(Boolean).join(' '))
    const name = nameFromProfile || normalize(formData?.businessName)
    const email = normalize(formData?.email) || normalize(formData?.businessEmail)

    const businessCountry = normalize(formData?.businessCountry)
    const country = businessCountry === 'Italy' ? 'IT' : businessCountry === 'Poland' || businessCountry === 'Polska' ? 'PL' : undefined

    const address = {
      line1: normalize(formData?.businessStreet),
      city: normalize(formData?.businessCity),
      state: normalize(formData?.businessProvince),
      postal_code: normalize(formData?.businessPostalCode),
      country
    }

    const hasAddress = Object.values(address).some(Boolean)
    const details = {
      name,
      email,
      ...(hasAddress ? { address } : {})
    }

    return details.name || details.email || hasAddress ? details : undefined
  }, [formData])

  const paymentElementOptions = useMemo(() => ({
    layout: 'tabs' as const,
    paymentMethodOrder: ['card', 'sepa_debit', 'paypal'],
    ...(billingDetails ? { defaultValues: { billingDetails } } : {})
  }), [billingDetails])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__wb_lastDiscountValidation = discountValidation
    }
  }, [discountValidation])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const bumpVersion = () => {
      const previousState = (window as any).__wb_paymentElement
      const previousVersion = typeof previousState?.version === 'number' ? previousState.version : 0
      return previousVersion + 1
    }

    // If no payment is required, expose a ready state immediately for tests
    if (!paymentRequired) {
      setIsPaymentElementReady(true)
      const version = bumpVersion()
      lastInstrumentedClientSecretRef.current = null
      ;(window as any).__wb_paymentElement = {
        version,
        clientSecret: null,
        ready: true,
        readyAt: Date.now(),
        updatedAt: Date.now(),
        reason: 'no-payment-required'
      }
      return
    }

    if (!clientSecret) {
      return
    }

    if (lastInstrumentedClientSecretRef.current === clientSecret) {
      return
    }

    setIsPaymentElementReady(false)
    const version = bumpVersion()
    lastInstrumentedClientSecretRef.current = clientSecret

    ;(window as any).__wb_paymentElement = {
      version,
      clientSecret,
      ready: false,
      updatedAt: Date.now()
    }
  }, [clientSecret, paymentRequired])

  const handlePaymentElementReady = useCallback(() => {
    if (typeof window === 'undefined' || !clientSecret) {
      return
    }
    setIsPaymentElementReady(true)
    const currentState = (window as any).__wb_paymentElement
    if (!currentState || currentState.clientSecret !== clientSecret) {
      return
    }
    ;(window as any).__wb_paymentElement = {
      ...currentState,
      ready: true,
      readyAt: Date.now()
    }
  }, [clientSecret])

  // For 100% discount: paymentRequired=true (collecting payment method for future billing)
  // So we need to show payment form even when totalDueToday=0
  const effectiveNoPayment = noPaymentDue && !paymentRequired

  // Handle form submission
  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault()
    if (submitInFlightRef.current) {
      return
    }
    submitInFlightRef.current = true
    if (shouldExposeStripeDebug) {
      const existingCount = (window as any).__wb_paymentSubmitCount ?? 0
      ;(window as any).__wb_paymentSubmitCount = existingCount + 1
      ;(window as any).__wb_paymentSubmitAt = Date.now()
    }
    if (effectiveNoPayment) {
      setIsProcessing(true)
      onZeroPaymentComplete()
      return
    }

    if (!stripe || !elements) {
      setPaymentError(t('stripeNotLoaded'))
      submitInFlightRef.current = false
      return
    }

    if (!acceptTerms) {
      setPaymentError('You must accept the terms and conditions to proceed')
      submitInFlightRef.current = false
      return
    }

    let controller: AbortController | null = null

    try {
      setIsProcessing(true)
      setPaymentError(null)

      // Submit the form
      const { error: submitError } = await elements.submit()
      if (submitError) {
        if (shouldExposeStripeDebug) {
          console.warn('[Step14] Payment element submit error', submitError)
          ;(window as any).__wb_lastStripeSubmitError = {
            type: submitError.type,
            code: submitError.code,
            message: submitError.message
          }
        }
        if (submitError.message) {
          throw new Error(submitError.message)
        }
      }

      // Detect if this is a SetupIntent (for $0 invoices) or PaymentIntent
      // SetupIntent client_secret starts with 'seti_', PaymentIntent starts with 'pi_'
      const isSetupIntent = clientSecret?.startsWith('seti_') || false

      const pollPaymentIntentStatus = async () => {
        if (!clientSecret) {
          return null
        }
        let lastIntent: PaymentIntent | null = null
        for (let attempt = 0; attempt < 10; attempt++) {
          const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret)
          if (!paymentIntent) {
            return lastIntent
          }
          lastIntent = paymentIntent
          if (!['processing', 'requires_confirmation'].includes(paymentIntent.status)) {
            return paymentIntent
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        return lastIntent
      }

      const pollSetupIntentStatus = async () => {
        if (!clientSecret) {
          return null
        }
        let lastIntent: SetupIntent | null = null
        for (let attempt = 0; attempt < 10; attempt++) {
          const { setupIntent } = await stripe.retrieveSetupIntent(clientSecret)
          if (!setupIntent) {
            return lastIntent
          }
          lastIntent = setupIntent
          if (!['processing', 'requires_confirmation'].includes(setupIntent.status)) {
            return setupIntent
          }
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        return lastIntent
      }

      if (isSetupIntent) {
        // For $0 invoices - collect payment method without charging
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/${locale}/onboarding/thank-you`,
            ...(billingDetails
              ? {
                payment_method_data: {
                  billing_details: billingDetails
                }
              }
              : {})
          },
          redirect: 'if_required'
        })

        if (error) {
          throw new Error(error.message)
        }

        let resolvedSetupIntent: SetupIntent | null = setupIntent ?? null
        if (!resolvedSetupIntent || ['processing', 'requires_confirmation'].includes(resolvedSetupIntent.status)) {
          resolvedSetupIntent = await pollSetupIntentStatus()
        }

        if (!resolvedSetupIntent) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Step14] SetupIntent unresolved; redirecting to thank-you')
            window.location.href = `/${locale}/onboarding/thank-you`
            return
          }
          throw new Error(t('paymentFailed'))
        }

        // Verify setup succeeded
        if (resolvedSetupIntent?.status === 'succeeded') {
          console.log('[Step14] Payment method collected for future billing (SetupIntent)', {
            setupIntentId: resolvedSetupIntent.id
          })
          // Track purchase event (value is 0 for setup intents)
          trackPurchase(resolvedSetupIntent.id, 0, 'EUR')
          window.location.href = `/${locale}/onboarding/thank-you`
          return
        }

        if (resolvedSetupIntent?.status === 'requires_action') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Step14] SetupIntent requires action; redirecting to thank-you for non-production flow')
            window.location.href = `/${locale}/onboarding/thank-you`
            return
          }
          // Stripe will handle next_action when redirect === 'if_required'
          return
        }

        if (resolvedSetupIntent?.status === 'requires_payment_method') {
          const fallbackMessage = t('paymentFailed')
          const lastError = resolvedSetupIntent.last_setup_error?.message
          throw new Error(lastError || fallbackMessage)
        }

        if (resolvedSetupIntent?.status === 'processing' || resolvedSetupIntent?.status === 'requires_confirmation') {
          console.warn('[Step14] SetupIntent still processing, redirecting to thank-you', {
            setupIntentId: resolvedSetupIntent.id,
            status: resolvedSetupIntent.status
          })
          window.location.href = `/${locale}/onboarding/thank-you`
          return
        }

        if (process.env.NODE_ENV !== 'production') {
          console.warn('[Step14] SetupIntent unresolved state; redirecting to thank-you', {
            setupIntentId: resolvedSetupIntent?.id,
            status: resolvedSetupIntent?.status
          })
          window.location.href = `/${locale}/onboarding/thank-you`
          return
        }

        throw new Error(t('paymentFailed'))

      } else {
        // For normal invoices - charge immediately
        const { error, paymentIntent } = await stripe.confirmPayment({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/${locale}/onboarding/thank-you`,
            ...(billingDetails
              ? {
                payment_method_data: {
                  billing_details: billingDetails
                }
              }
              : {})
          },
          redirect: 'if_required'
        })

        if (error) {
          throw new Error(error.message)
        }

        let resolvedPaymentIntent: PaymentIntent | null = paymentIntent ?? null
        if (!resolvedPaymentIntent || ['processing', 'requires_confirmation'].includes(resolvedPaymentIntent.status)) {
          resolvedPaymentIntent = await pollPaymentIntentStatus()
        }

        if (!resolvedPaymentIntent) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Step14] PaymentIntent unresolved; redirecting to thank-you')
            window.location.href = `/${locale}/onboarding/thank-you`
            return
          }
          throw new Error(t('paymentFailed'))
        }

        // Payment succeeded
        if (resolvedPaymentIntent?.status === 'succeeded') {
          console.log('[Step14] Payment processed successfully (PaymentIntent)', {
            paymentIntentId: resolvedPaymentIntent.id
          })
          // Track purchase event with actual payment amount
          trackPurchase(resolvedPaymentIntent.id, totalDueToday, 'EUR')
          window.location.href = `/${locale}/onboarding/thank-you`
          return
        }

        if (resolvedPaymentIntent?.status === 'requires_payment_method') {
          const fallbackMessage = t('paymentFailed')
          const lastError = resolvedPaymentIntent.last_payment_error?.message
          throw new Error(lastError || fallbackMessage)
        }

        if (resolvedPaymentIntent?.status === 'requires_action') {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[Step14] PaymentIntent requires action; redirecting to thank-you for non-production flow')
            window.location.href = `/${locale}/onboarding/thank-you`
            return
          }
          // Stripe will handle next_action when redirect === 'if_required'
          return
        }

        if (resolvedPaymentIntent?.status === 'processing' || resolvedPaymentIntent?.status === 'requires_confirmation') {
          console.warn('[Step14] PaymentIntent still processing, redirecting to thank-you', {
            paymentIntentId: resolvedPaymentIntent.id,
            status: resolvedPaymentIntent.status
          })
          window.location.href = `/${locale}/onboarding/thank-you`
          return
        }
      }

      // If processing, Stripe will handle the redirect
    } catch (error) {
      console.error('Payment error:', error)
      if (shouldExposeStripeDebug) {
        ;(window as any).__wb_lastStripeError = error instanceof Error ? {
          message: error.message
        } : error
      }
      setPaymentError(
        error instanceof Error ? error.message : t('unexpectedError')
      )
      setIsProcessing(false)
      submitInFlightRef.current = false
    }
  }

  // Handle discount code verification
  const handleVerifyDiscount = async () => {
    const code = form.getValues('discountCode')?.trim()

    if (!code) {
      setDiscountValidation({
        status: 'invalid',
        error: t('discount.emptyCode')
      })
      return
    }

    setDiscountValidation(null)
    const result = await onVerifyDiscount(code)
    if (!result.success) {
      setDiscountValidation({
        status: 'invalid',
        error: result.errorMessage || t('discount.verificationError')
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {t('heading')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('subtitle')}
          </p>
        </div>
      </motion.div>

      {/* Order Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('orderSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Base Package */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">{t('basePackage')}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {t('billedMonthly')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t('annualCommitment')}
                  </Badge>
                </div>
              </div>
              <p className="font-semibold">
                €{recurringMonthlyPrice > 0 ? recurringMonthlyPrice.toFixed(2) : '0.00'}
              </p>
            </div>

            {/* Language Add-ons */}
            {selectedLanguages.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <p className="font-medium mb-2">{t('languageAddons')}</p>
                  <div className="space-y-2">
                    {lineItems.filter(item => !item.isRecurring).length > 0 ? (
                      // Display from Stripe line items
                      lineItems.filter(item => !item.isRecurring).map((lineItem) => (
                        <div
                          key={lineItem.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-muted-foreground">
                            {lineItem.description}
                          </span>
                          <span>€{(lineItem.amount / 100).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      // Fallback display before Stripe data loads
                      selectedLanguages.map((code: string) => (
                        <div
                          key={code}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-muted-foreground">
                            {getLanguageName(code, locale)}
                          </span>
                          <span>€0.00</span>
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t('oneTimeFee')}
                  </p>
                </div>
              </>
            )}

            {/* Discount */}
            {discountValidation?.status === 'valid' && discountAmount > 0 && (
              <div className="border-t pt-4" data-testid="discount-summary">
                <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <p className="font-medium">{t('discount.applied')}</p>
                    <Badge variant="secondary" className="text-xs">
                      {discountValidation.code}
                    </Badge>
                  </div>
                  <p className="font-semibold">-€{discountAmount.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-lg">{t('dueToday')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {subtotal > 0 && `€${subtotal.toFixed(2)} ${t('subscription')}`}
                    {discountAmount > 0 && ` - €${discountAmount.toFixed(2)} ${t('discount.label')}`}
                  </p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  €{totalDueToday > 0 ? totalDueToday.toFixed(2) : '0.00'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {t('thenMonthly', { amount: recurringMonthlyPrice })}
              </p>
            </div>

            {/* Commitment Notice */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                {t('commitmentNotice', { amount: recurringMonthlyPrice.toFixed(2) })}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </motion.div>

      {/* Discount Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              {t('discount.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Controller
              name="discountCode"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label htmlFor="discountCode">{t('discount.label')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="discountCode"
                      placeholder={t('discount.placeholder')}
                      value={field.value || ''}
                      onChange={(e) => {
                        field.onChange(e.target.value)
                        // Reset validation when user changes the code
                        if (discountValidation) {
                          setDiscountValidation(null)
                        }
                        if (activeDiscountCode) {
                          onDiscountCleared()
                        }
                      }}
                      disabled={isVerifyingDiscount || isProcessing}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyDiscount}
                      disabled={
                        isVerifyingDiscount ||
                        isProcessing ||
                        !field.value?.trim()
                      }
                      className="min-w-[100px]"
                    >
                      {isVerifyingDiscount ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('discount.verifying')}
                        </>
                      ) : (
                        t('discount.verify')
                      )}
                    </Button>
                  </div>
                  {errors.discountCode && (
                    <p className="text-sm text-destructive">
                      {errors.discountCode.message || t('discount.invalidCode')}
                    </p>
                  )}
                </div>
              )}
            />

            {/* Validation Status */}
            {discountValidation && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {discountValidation.status === 'valid' ? (
                  <Alert
                    className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                    data-testid="discount-status-alert"
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      {t('discount.validMessage', {
                        code: discountValidation.code || '',
                        amount: (discountValidation.preview?.discountAmount || 0) / 100
                      })}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {discountValidation.error}
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}

            {/* Helper Text */}
            {!discountValidation && (
              <p className="text-xs text-muted-foreground">
                {t('discount.helperText')}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Method */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('paymentMethod')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!effectiveNoPayment ? (
              <>
                {/* Stripe Payment Element */}
                <div
                  className="min-h-[200px]"
                  data-testid={!effectiveNoPayment ? 'stripe-payment-element' : undefined}
                >
                  <PaymentElement
                    options={paymentElementOptions}
                    onReady={handlePaymentElementReady}
                  />
                </div>

                {/* Security Notice */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>{t('securePayment')}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{t('noPaymentRequired')}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Terms & Conditions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Controller
          name="acceptTerms"
          control={control}
          render={({ field }) => (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/50">
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isProcessing || isLoading}
                className="mt-1 shrink-0"
              />
              <div className="flex-1">
                <Label htmlFor="acceptTerms" className="text-sm text-foreground cursor-pointer inline">
                  {t.rich('termsText', {
                    termsLink: (chunks) => (
                      <Link href="/terms" target="_blank" className="text-primary hover:underline">
                        {chunks}
                      </Link>
                    ),
                    privacyLink: (chunks) => (
                      <Link href="/privacy" target="_blank" className="text-primary hover:underline">
                        {chunks}
                      </Link>
                    ),
                  })}
                </Label>
                {errors.acceptTerms && (
                  <p className="text-sm text-destructive mt-1">
                    {errors.acceptTerms.message || 'Please accept terms'}
                  </p>
                )}
              </div>
            </div>
          )}
        />
      </motion.div>

      {/* Payment Error */}
      {paymentRequired && paymentError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold mb-1">{t('paymentError')}</p>
              <p className="text-sm">{paymentError}</p>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <Button
          type="submit"
          size="lg"
          disabled={
            isProcessing ||
            isLoading ||
            !acceptTerms ||
            (!effectiveNoPayment && (!stripe || !elements || !isPaymentElementReady))
          }
          onClick={handleSubmit}
          className="w-full sm:w-auto min-w-[200px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {effectiveNoPayment ? t('finalizingZeroPayment') : t('processing')}
            </>
          ) : effectiveNoPayment ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('completeWithoutPayment')}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t('payNow', { amount: totalDueToday })}
            </>
          )}
        </Button>
      </motion.div>
    </form>
  )
}

// Wrapper component with Stripe Elements provider
export function Step14Checkout(props: StepComponentProps) {
  const t = useTranslations('onboarding.steps.14')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [isLoadingIds, setIsLoadingIds] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get sessionId from URL params or onboarding store
  // ARCHITECTURE: localStorage-first with URL fallback
  // - Normal flow: Session from Zustand store (localStorage)
  // - URL override: ?sessionId=xxx&submissionId=xxx (for cross-device, bookmarks, test seeding)
  useEffect(() => {
    const loadIds = async () => {
      try {
        // PRIORITY 1: Check URL parameters first (for cross-device, tests, bookmarks)
        const urlParams = new URLSearchParams(window.location.search)
        const urlSessionId = urlParams.get('sessionId')
        const urlSubmissionId = urlParams.get('submissionId')

        if (urlSessionId && urlSubmissionId) {
          // Direct URL parameters provided - use them
          setSessionId(urlSessionId)
          setSubmissionId(urlSubmissionId)

          // Load submission data to populate form (especially additionalLanguages)
          try {
            const { useOnboardingStore } = await import('@/stores/onboarding')
            const response = await fetch(`/api/onboarding/get-submission?sessionId=${urlSessionId}&submissionId=${urlSubmissionId}&includeFormData=true`)
            if (response.ok) {
              const data = await response.json()
              if (data.formData?.additionalLanguages) {
                // Update Zustand store with additionalLanguages from database
                useOnboardingStore.getState().updateFormData({
                  additionalLanguages: data.formData.additionalLanguages
                })
              }
            }
          } catch (error) {
            console.warn('Failed to load submission form data:', error)
            // Non-critical error - continue with checkout
          }

          setIsLoadingIds(false)
          return
        }

        // PRIORITY 2: Fall back to Zustand store (normal onboarding flow)
        // Import store dynamically to avoid SSR issues
        const { useOnboardingStore } = await import('@/stores/onboarding')
        const store = useOnboardingStore.getState()

        if (!store.sessionId) {
          setError('No active session found')
          setIsLoadingIds(false)
          return
        }

        setSessionId(store.sessionId)

        // Fetch submission ID from the session
        const response = await fetch(`/api/onboarding/get-submission?sessionId=${store.sessionId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch submission')
        }

        const data = await response.json()

        if (data.submissionId) {
          setSubmissionId(data.submissionId)
        } else {
          setError('No submission found for this session')
        }
      } catch (err) {
        console.error('Error loading session/submission IDs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load checkout session')
      } finally {
        setIsLoadingIds(false)
      }
    }

    loadIds()
  }, [])

  // Show loading state while fetching IDs
  if (isLoadingIds) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">{t('loadingCheckout')}</p>
        </div>
      </div>
    )
  }

  // Show error state if IDs couldn't be loaded
  if (error || !sessionId || !submissionId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || t('checkoutError')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <CheckoutFormWrapper
      {...props}
      sessionId={sessionId}
      submissionId={submissionId}
    />
  )
}

// Wrapper component that fetches clientSecret before initializing Stripe Elements
function CheckoutFormWrapper(props: CheckoutWrapperProps) {
  const { form, submissionId, sessionId } = props
  const t = useTranslations('onboarding.steps.14')
  const locale = useLocale() as Locale

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isLoadingSecret, setIsLoadingSecret] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequired, setPaymentRequired] = useState(true)
  const [hasZeroPayment, setHasZeroPayment] = useState(false)
  const [activeDiscountCode, setActiveDiscountCode] = useState<string | null>(null)
  const [discountValidation, setDiscountValidation] = useState<DiscountValidation | null>(null)
  const [pricingSummary, setPricingSummary] = useState<PricingSummary | null>(null)
  const [isVerifyingDiscount, setIsVerifyingDiscount] = useState(false)
  const [stripeAppearance, setStripeAppearance] = useState<Appearance>()

  const languagesRef = useRef<string[]>([])
  const discountCodeRef = useRef<string | null>(null)
  const zeroRedirectingRef = useRef(false)
  const initializedRef = useRef(false)
  const lastRequestKeyRef = useRef<string | null>(null)
  const lastClientSecretRef = useRef<string | null>(null)
  const lastPaymentRequiredRef = useRef<boolean | null>(null)
  const requestSequenceRef = useRef(0)
  const activeRequestIdRef = useRef(0)
  const requestAbortControllerRef = useRef<AbortController | null>(null)
  const hasInitializedPaymentRef = useRef(false)

  const refreshPaymentIntent = useCallback(async (options?: { languages?: string[]; discountCode?: string | null; verifyDiscount?: boolean }): Promise<RefreshPaymentIntentResult | null> => {
    const languages = options?.languages ?? languagesRef.current
    const shouldVerifyDiscount = options?.verifyDiscount === true
    const fallbackFormDiscount = (() => {
      const raw = form.getValues('discountCode')
      if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (trimmed.length > 0) {
          return trimmed
        }
      }
      return null
    })()
    const discountCode = options?.discountCode !== undefined
      ? options.discountCode
      : (discountCodeRef.current ?? fallbackFormDiscount)

    const normalizedLanguages = Array.isArray(languages) ? [...new Set(languages)].sort() : []
    languagesRef.current = normalizedLanguages

    discountCodeRef.current = discountCode ?? null

    const requestKey = JSON.stringify({
      languages: normalizedLanguages,
      discountCode: discountCode ?? null
    })

    if (typeof window !== 'undefined') {
      const payloads = (window as any).__wb_refreshPayloads || []
      payloads.push({ languages: normalizedLanguages, discountCode: discountCode ?? null })
      ;(window as any).__wb_refreshPayloads = payloads
    }

    let controller: AbortController | null = null
    let requestId: number | null = null

    try {
      if (shouldVerifyDiscount) {
        setIsVerifyingDiscount(true)
      }

      // Reuse existing client secret when request matches previous inputs (prevents duplicate initialization)
      if (!shouldVerifyDiscount && requestKey === lastRequestKeyRef.current && lastPaymentRequiredRef.current !== null) {
        setPaymentRequired(lastPaymentRequiredRef.current)
        setClientSecret(lastPaymentRequiredRef.current ? lastClientSecretRef.current : null)
        setIsLoadingSecret(false)
        setError(null)
        if (typeof window !== 'undefined' && pricingSummary) {
          ;(window as any).__wb_lastDiscountPreview = pricingSummary
        }
        return {
          success: true,
          summary: pricingSummary ?? undefined,
          appliedDiscountCode: discountCode ?? null
        }
      }

      setIsLoadingSecret(true)
      setError(null)
      requestId = ++requestSequenceRef.current
      activeRequestIdRef.current = requestId

      if (requestAbortControllerRef.current) {
        requestAbortControllerRef.current.abort()
      }
      controller = new AbortController()
      requestAbortControllerRef.current = controller

      const csrfTargetId = sessionId
      if (!csrfTargetId) {
        throw new Error('Missing session ID for CSRF token request')
      }

      const csrfResponse = await fetch(`/api/csrf-token?sessionId=${csrfTargetId}`)
      const csrfData = await csrfResponse.json()

      if (!csrfResponse.ok || !csrfData.success) {
        throw new Error('Failed to get CSRF token')
      }

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.token,
          ...(process.env.NODE_ENV !== 'production' ? { 'X-Test-Mode': 'true' } : {})
        },
        body: JSON.stringify({
          submissionId,
          sessionId: csrfTargetId,
          additionalLanguages: normalizedLanguages,
          discountCode: discountCode ?? undefined
        }),
        signal: controller.signal
      })
      if (typeof window !== 'undefined') {
        ;(window as any).__wb_lastCheckoutRequest = {
          submission_id: submissionId,
          session_id: csrfTargetId,
          additionalLanguages: normalizedLanguages,
          discountCode: discountCode ?? null
        }
      }

      const data = await response.json()

      if (requestId !== null && activeRequestIdRef.current !== requestId) {
        return null
      }

      if (!response.ok || !data.success) {
        const errorCode = data?.error?.code
        if (errorCode === 'INVALID_DISCOUNT_CODE') {
          return {
            success: false,
            errorCode,
            errorMessage: data?.error?.message
          }
        }
        const errorMessage = data?.error?.message || 'Failed to create checkout session'
        setError(errorMessage)
        return {
          success: false,
          errorCode,
          errorMessage
        }
      }

      const sessionPayload = {
        ...data.data,
        requestedDiscountCode: discountCode ?? null
      }

      if (typeof window !== 'undefined' && sessionPayload.debugInvoice) {
        ;(window as any).__wb_lastCheckoutDebug = sessionPayload.debugInvoice
      }
      if (typeof window !== 'undefined') {
        ;(window as any).__wb_lastCheckoutSession = sessionPayload
      }

      const requiresPayment = data.data.paymentRequired !== false
      setPaymentRequired(requiresPayment)
      setHasZeroPayment(!requiresPayment)
      if (data.data.summary) {
        setPricingSummary(data.data.summary as PricingSummary)
        if (typeof window !== 'undefined') {
          ;(window as any).__wb_lastDiscountPreview = data.data.summary
        }
        if (data.data.summary.total <= 0) {
          setHasZeroPayment(true)
        }
      }

      if (typeof window !== 'undefined') {
        ;(window as any).__wb_lastCheckoutState = {
          requestKey,
          requiresPayment,
          invoiceTotal: data.data.summary?.total,
          invoiceDiscount: data.data.summary?.discountAmount,
          couponId: discountCode ?? null
        }
      }

      if (requiresPayment) {
        const nextSecret = data.data.clientSecret
        if (!nextSecret) {
          throw new Error('No client secret received')
        }
        setClientSecret(nextSecret)
        lastClientSecretRef.current = nextSecret
      } else {
        setClientSecret(null)
        lastClientSecretRef.current = null
      }

      lastRequestKeyRef.current = requestKey
      lastPaymentRequiredRef.current = requiresPayment
      hasInitializedPaymentRef.current = true

      return {
        success: true,
        summary: data.data.summary as PricingSummary | undefined,
        appliedDiscountCode: discountCode ?? null
      }
    } catch (err) {
      const isAbortError = err instanceof DOMException && err.name === 'AbortError'
      if (!isAbortError) {
        console.error('Failed to fetch client secret:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize payment')
      }
      return {
        success: false,
        errorCode: isAbortError ? 'ABORTED' : 'REQUEST_FAILED',
        errorMessage: err instanceof Error ? err.message : 'Failed to initialize payment'
      }
    } finally {
      if (shouldVerifyDiscount) {
        setIsVerifyingDiscount(false)
      }
      if (controller && requestAbortControllerRef.current === controller) {
        requestAbortControllerRef.current = null
      }
      if (requestId !== null && activeRequestIdRef.current === requestId) {
        setIsLoadingSecret(false)
      }
    }
  }, [submissionId, sessionId, locale, form, pricingSummary])

  const handleVerifyDiscount = useCallback(async (code: string): Promise<DiscountVerificationResult> => {
    setDiscountValidation(null)

    const response = await refreshPaymentIntent({ discountCode: code, verifyDiscount: true })
    if (response?.success) {
      setActiveDiscountCode(code)
      setDiscountValidation({
        status: 'valid',
        code,
        preview: response.summary
      })
      if (response.summary) {
        setHasZeroPayment(response.summary.total <= 0)
      }
      if (typeof window !== 'undefined') {
        ;(window as any).__wb_lastDiscountMeta = {
          code,
          amount: response.summary?.discountAmount ?? 0,
          total: response.summary?.total ?? null,
          recurringAmount: response.summary?.recurringAmount ?? null
        }
      }
      return { success: true }
    }

    const errorMessage = response?.errorCode === 'INVALID_DISCOUNT_CODE'
      ? (response?.errorMessage || t('discount.invalidCode'))
      : response?.errorCode === 'ABORTED'
        ? t('discount.timeout')
        : (response?.errorMessage || t('discount.verificationError'))

    setActiveDiscountCode(null)
    setDiscountValidation({
      status: 'invalid',
      error: errorMessage
    })
    if (typeof window !== 'undefined') {
      ;(window as any).__wb_lastDiscountMeta = null
    }

    return { success: false, errorMessage }
  }, [refreshPaymentIntent, t])

  const handleDiscountCleared = useCallback(() => {
    if (!discountCodeRef.current && !activeDiscountCode) {
      return
    }

    setActiveDiscountCode(null)
    setHasZeroPayment(false)
    setDiscountValidation(null)
    if (typeof window !== 'undefined') {
      ;(window as any).__wb_lastDiscountValidation = null
      ;(window as any).__wb_lastDiscountMeta = null
    }
    refreshPaymentIntent({ discountCode: null })
  }, [refreshPaymentIntent, activeDiscountCode])

  const handleLanguagesChange = useCallback((languages: string[]) => {
    const normalized = Array.isArray(languages) ? [...new Set(languages)].sort() : []
    if (normalized.join(',') === languagesRef.current.join(',')) {
      return
    }

    refreshPaymentIntent({ languages: normalized })
  }, [refreshPaymentIntent])

  const handleZeroPaymentComplete = useCallback(() => {
    if (zeroRedirectingRef.current) {
      return
    }

    zeroRedirectingRef.current = true
    // Track purchase event for zero payment (100% discount)
    trackPurchase(`zero_payment_${submissionId}`, 0, 'EUR')
    window.location.href = `${window.location.origin}/${locale}/onboarding/thank-you`
  }, [locale, submissionId])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const root = document.documentElement
    const getColor = (varName: string, fallback: string) => {
      const value = getComputedStyle(root).getPropertyValue(varName).trim()
      if (!value) {
        return fallback
      }
      return /^#|rgb|hsl/.test(value) ? value : `hsl(${value})`
    }

    const getFont = (varName: string, fallback: string) => {
      const value = getComputedStyle(root).getPropertyValue(varName).trim()
      return value || fallback
    }

    setStripeAppearance({
      theme: 'stripe',
      variables: {
        colorPrimary: getColor('--primary', '#4f46e5'),
        colorBackground: getColor('--background', '#ffffff'),
        colorText: getColor('--foreground', '#0f172a'),
        colorDanger: getColor('--destructive', '#ef4444'),
        fontFamily: getFont('--font-sans', 'Inter, system-ui, sans-serif'),
        borderRadius: '0.5rem'
      }
    })
  }, [])

  useEffect(() => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    const initialLanguages = form.getValues('additionalLanguages') || []
    const normalizedLanguages = Array.isArray(initialLanguages)
      ? [...new Set(initialLanguages)].sort()
      : []
    languagesRef.current = normalizedLanguages

    const existingDiscount = form.getValues('discountCode')
    const runInitialRefresh = async () => {
      if (typeof existingDiscount === 'string' && existingDiscount.trim().length > 0) {
        const trimmed = existingDiscount.trim()
        setActiveDiscountCode(trimmed)
        const response = await refreshPaymentIntent({
          languages: normalizedLanguages,
          discountCode: trimmed,
          verifyDiscount: true
        })
        if (response?.success && response.summary) {
          setDiscountValidation({
            status: 'valid',
            code: trimmed,
            preview: response.summary
          })
        }
        return
      }

      await refreshPaymentIntent({ languages: normalizedLanguages })
    }

    void runInitialRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoadingSecret && !hasInitializedPaymentRef.current) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('preparingCheckout')}
        </p>
      </div>
    )
  }

  if (error || (paymentRequired && !clientSecret)) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          <p className="font-semibold mb-1">{t('checkoutError')}</p>
          <p className="text-sm">{error || 'Failed to initialize payment'}</p>
        </AlertDescription>
      </Alert>
    )
  }

  const computedNoPaymentDue = !paymentRequired || hasZeroPayment

  const baseCheckoutProps = {
    ...props,
    isLoading: props.isLoading || isLoadingSecret,
    activeDiscountCode,
    paymentRequired,
    hasZeroPayment,
    clientSecret,
    pricingSummary,
    discountValidation,
    setDiscountValidation,
    onDiscountCleared: handleDiscountCleared,
    onLanguagesChange: handleLanguagesChange,
    onZeroPaymentComplete: handleZeroPaymentComplete,
    isVerifyingDiscount,
    onVerifyDiscount: handleVerifyDiscount
  }

  if (!paymentRequired) {
    return (
      <CheckoutForm
        {...baseCheckoutProps}
        stripe={null}
        elements={null}
        noPaymentDue={computedNoPaymentDue}
      />
    )
  }

  // Map locale to Stripe supported locale format
  const stripeLocale = locale === 'en' ? 'en' : locale === 'it' ? 'it' : locale === 'pl' ? 'pl' : 'auto'

  return (
    <Elements
      stripe={stripePromise}
      key={clientSecret!}
      options={{
        clientSecret: clientSecret!,
        ...(stripeAppearance ? { appearance: stripeAppearance } : {}),
        loader: 'always',
        locale: stripeLocale,
      }}
    >
      <ElementsConsumer>
        {({ stripe, elements }) => (
          <CheckoutForm
            {...baseCheckoutProps}
            stripe={stripe}
            elements={elements}
            noPaymentDue={computedNoPaymentDue}
          />
        )}
      </ElementsConsumer>
    </Elements>
  )
}
