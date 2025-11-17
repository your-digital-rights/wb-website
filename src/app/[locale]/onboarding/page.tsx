'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Clock, Shield, BadgeCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useOnboardingStore } from '@/stores/onboarding'
import { usePricing } from '@/hooks/usePricing'

export default function OnboardingWelcome() {
  const t = useTranslations('onboarding.welcome')
  const router = useRouter()
  const params = useParams<{ locale?: 'en' | 'it' }>()
  const locale = (params?.locale ?? 'en') as 'en' | 'it'
  const { initializeSession, loadExistingSession } = useOnboardingStore()
  const [mounted, setMounted] = useState(false)
  const { basePackagePrice } = usePricing()

  // Handle hydration and session check
  useEffect(() => {
    setMounted(true)

    const checkSessionAndPayment = async () => {
      // PRIORITY 1: Check for session ID in URL (recovery email link)
      const urlParams = new URLSearchParams(window.location.search)
      const urlSessionId = urlParams.get('sessionId')

      if (urlSessionId) {
        try {
          // Load session from URL parameter (recovery email scenario)
          const { initSession } = useOnboardingStore.getState()
          await initSession(urlSessionId)

          // Get the current step from the loaded session
          const loadedSession = useOnboardingStore.getState()
          const step = loadedSession.currentStep || 1

          // Redirect to the appropriate step
          router.push(`/${locale}/onboarding/step/${step}`)
          return
        } catch (error) {
          console.error('Failed to load session from URL:', error)
          // Fall through to check localStorage
        }
      }

      // PRIORITY 2: Check for existing session in localStorage
      const existingSession = loadExistingSession()

      if (existingSession && existingSession.id) {
        // Check if payment has been completed for this session
        try {
          const response = await fetch(`/api/onboarding/status?session_id=${existingSession.id}`)
          if (response.ok) {
            const data = await response.json()

            // If payment is completed, redirect to thank-you page
            if (data.status === 'paid') {
              router.push(`/${locale}/onboarding/thank-you`)
              return
            }
          }
        } catch (error) {
          console.error('Failed to check payment status:', error)
          // Continue with normal flow if status check fails
        }

        // Only redirect if there's a valid session with an ID (not just default state)
        if (existingSession.currentStep && existingSession.currentStep > 1) {
          // Redirect to appropriate step
          router.push(`/${locale}/onboarding/step/${existingSession.currentStep}`)
        }
      }
    }

    checkSessionAndPayment()
  }, [loadExistingSession, router, locale])

  const handleStart = async () => {
    try {
      const session = await initializeSession(locale)
      const step = session.currentStep && session.currentStep >= 1 ? session.currentStep : 1
      router.push(`/${locale}/onboarding/step/${step}`)
    } catch (error) {
      console.error('Failed to initialize onboarding session:', error)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-4 -right-4 text-primary/20 hidden md:block"
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent max-w-3xl mx-auto leading-tight pb-2">
              {t('title')}
            </h1>
          </div>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 my-12"
        >
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{t('features.fast.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.fast.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{t('features.secure.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.secure.description')}
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">{t('features.smart.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.smart.description')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Process Steps */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('process.title')}</h2>
          
          <div className="grid md:grid-cols-4 gap-4 text-left">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {step}
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                    {t(`process.steps.${step}.title`)}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`process.steps.${step}.description`, { price: basePackagePrice })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Money Back Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-accent/10 border border-accent/20 rounded-lg p-6"
        >
          <div className="flex items-center justify-center gap-3">
            <BadgeCheck className="w-6 h-6 text-accent flex-shrink-0" />
            <p className="text-lg font-semibold text-foreground text-center">
              {t('guarantee.text')}
            </p>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="space-y-6 pt-4"
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
            <Button
              size="lg"
              onClick={handleStart}
              className="gap-2 px-8 w-full sm:w-auto"
              disabled={!mounted}
            >
              {t('actions.start')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {t('disclaimer')}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
