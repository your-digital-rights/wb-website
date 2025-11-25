'use client'

import { ReactNode, useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useOnboardingStore } from '@/stores/onboarding'
import { cn } from '@/lib/utils'
import { LiveRegion } from './AccessibilityAnnouncer'

interface StepTemplateProps {
  stepNumber: number
  title: string
  description: string
  children: ReactNode
  onNext?: () => void
  onPrevious?: () => void
  nextLabel?: string
  previousLabel?: string
  canGoNext?: boolean
  canGoPrevious?: boolean
  isLoading?: boolean
  error?: string
  className?: string
  hideNavigation?: boolean
}

export function StepTemplate({
  stepNumber,
  title,
  description,
  children,
  onNext,
  onPrevious,
  nextLabel,
  previousLabel,
  canGoNext = true,
  canGoPrevious = true,
  isLoading = false,
  error,
  className,
  hideNavigation = false
}: StepTemplateProps) {
  const t = useTranslations('onboarding')
  const tA11y = useTranslations('onboarding.accessibility')
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()

  // Refs for focus management
  const mainHeadingRef = useRef<HTMLHeadingElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef<number | null>(null)

  const {
    autoSaveStatus,
    isSessionExpired,
    checkSessionExpired,
    recoverSession
  } = useOnboardingStore()

  // Detect OS for keyboard hint (macOS uses Option key, others use Alt)
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform))
  }, [])

  // Focus management: Move focus to heading when step changes
  useEffect(() => {
    // Only focus if we're transitioning between steps (not on initial load)
    if (previousStepRef.current !== null && previousStepRef.current !== stepNumber) {
      // Small delay to ensure DOM is updated after animation starts
      const focusTimeout = setTimeout(() => {
        mainHeadingRef.current?.focus()
      }, shouldReduceMotion ? 50 : 350)

      return () => clearTimeout(focusTimeout)
    }
    previousStepRef.current = stepNumber
  }, [stepNumber, shouldReduceMotion])

  // Check for session expiration
  useEffect(() => {
    checkSessionExpired()
  }, [checkSessionExpired])

  // Handle keyboard shortcut for navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Alt + Arrow keys for step navigation (with modifier to avoid conflicts)
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.key === 'ArrowRight' && canGoNext && !isLoading && onNext) {
        event.preventDefault()
        onNext()
      } else if (event.key === 'ArrowLeft' && canGoPrevious && onPrevious) {
        event.preventDefault()
        onPrevious()
      }
    }
  }, [canGoNext, canGoPrevious, isLoading, onNext, onPrevious])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Skip to main content handler
  const handleSkipToContent = () => {
    mainContentRef.current?.focus()
  }

  // Handle session recovery
  const handleRecoverSession = async () => {
    try {
      await recoverSession()
    } catch (error) {
      console.error('Failed to recover session:', error)
      router.push('/onboarding')
    }
  }

  // Animation variants
  const containerVariants = {
    initial: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: shouldReduceMotion ? 0 : -20 }
  }

  const buttonVariants = {
    hover: { scale: shouldReduceMotion ? 1 : 1.02 },
    tap: { scale: shouldReduceMotion ? 1 : 0.98 }
  }

  // Progress calculation
  const progressPercentage = (stepNumber / 14) * 100

  // Auto-save indicator with screen reader announcements
  const renderAutoSaveIndicator = () => {
    if (autoSaveStatus === 'saving') {
      return (
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Save className="h-4 w-4 animate-pulse" aria-hidden="true" />
          {/* Visual text hidden from SR, more descriptive text for SR */}
          <span aria-hidden="true">{t('saving')}</span>
          <span className="sr-only">{tA11y('autoSaveSaving')}</span>
        </div>
      )
    }

    if (autoSaveStatus === 'saved') {
      return (
        <div
          className="flex items-center gap-2 text-sm text-green-600"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {/* Visual text hidden from SR, more descriptive text for SR */}
          <span aria-hidden="true">{t('saved')}</span>
          <span className="sr-only">{tA11y('autoSaveSaved')}</span>
        </div>
      )
    }

    return null
  }

  // Session expired overlay
  if (isSessionExpired) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-background border rounded-lg shadow-lg p-6 max-w-md w-full"
        >
          <h2 className="text-lg font-semibold mb-2 text-foreground">{t('sessionExpired.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('sessionExpired.description')}</p>
          <div className="flex gap-3">
            <Button
              onClick={handleRecoverSession}
              className="flex-1"
            >
              {t('sessionExpired.recover')}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/onboarding')}
              className="flex-1"
            >
              {t('sessionExpired.startOver')}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Screen reader announcement for step changes
  const stepAnnouncement = `${tA11y('stepAnnouncement', { step: stepNumber, total: 14, title })}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Screen reader announcement for step changes */}
      <LiveRegion message={stepAnnouncement} priority="assertive" clearAfter={2000} />

      {/* Skip to main content link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          handleSkipToContent()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-md focus:border focus:border-border focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {tA11y('skipToContent')}
      </a>

      {/* Progress Bar */}
      <nav
        aria-label={tA11y('progressNavigation')}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground" aria-hidden="true">
                {t('step')} {stepNumber} {t('of')} 14
              </span>
              {/* Accessible step indicator for screen readers */}
              <span className="sr-only">
                {tA11y('currentStep', { step: stepNumber, total: 14 })}
              </span>
              {renderAutoSaveIndicator()}
            </div>
            <div className="text-sm font-medium" aria-hidden="true">
              {Math.round(progressPercentage)}%
            </div>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
            aria-label={t('progressLabel', { step: stepNumber, total: 14 })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercentage)}
          />
        </div>
      </nav>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.main
          key={stepNumber}
          id="main-content"
          ref={mainContentRef}
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: shouldReduceMotion ? 0.1 : 0.3,
            ease: "easeInOut"
          }}
          className="container mx-auto px-4 py-8 max-w-4xl"
          style={{
            paddingBottom: 'calc(var(--cookie-consent-height, 0px) + var(--wb-space-8, 2rem) + env(safe-area-inset-bottom))'
          }}
          tabIndex={-1}
          aria-labelledby="step-heading"
        >
          {/* Step Header */}
          <header className="text-center mb-8">
            <motion.h1
              id="step-heading"
              ref={mainHeadingRef}
              className="text-3xl md:text-4xl font-bold mb-4 text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              tabIndex={-1}
            >
              {title}
            </motion.h1>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {description}
            </motion.p>
          </header>

          {/* Step Content */}
          <section
            aria-label={tA11y('stepContent', { step: stepNumber })}
          >
            <motion.div
              className={cn(
                "bg-card border rounded-xl shadow-sm p-6 md:p-8",
                className
              )}
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {children}
            </motion.div>
          </section>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -10 }}
              className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3 mt-6"
              role="alert"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </motion.div>
          )}

          {/* Navigation */}
          {!hideNavigation && (
            <nav
              aria-label={tA11y('stepNavigation')}
              className="mt-8 group/nav"
            >
              {/* Keyboard navigation hint for screen readers */}
              <p className="sr-only" id="keyboard-nav-hint">
                {tA11y('keyboardNavHint').replace('Alt', isMac ? 'Option' : 'Alt')}
              </p>

              <motion.div
                className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                aria-describedby="keyboard-nav-hint"
              >
                {/* Previous Button */}
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full md:w-auto order-2 md:order-1"
                >
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onPrevious}
                    disabled={!canGoPrevious || isLoading}
                    className="gap-2 w-full md:w-auto"
                    aria-label={tA11y('goToPreviousStep', { step: stepNumber - 1 })}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {previousLabel || t('previous')}
                  </Button>
                </motion.div>

                {/* Step Indicators */}
                <div
                  className="hidden md:flex items-center gap-2 order-2"
                  role="group"
                  aria-label={tA11y('stepIndicators')}
                >
                  {Array.from({ length: 14 }, (_, i) => (
                    <div
                      key={i}
                      role="presentation"
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i < stepNumber
                          ? "bg-primary"
                          : i === stepNumber - 1
                            ? "bg-primary/60"
                            : "bg-muted-foreground/20"
                      )}
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {/* Next Button */}
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full md:w-auto order-1 md:order-3"
                >
                  <Button
                    size="lg"
                    onClick={onNext}
                    disabled={!canGoNext || isLoading}
                    className="gap-2 w-full md:w-auto"
                    aria-label={stepNumber < 14 ? tA11y('goToNextStep', { step: stepNumber + 1 }) : tA11y('completeOnboarding')}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div
                          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                          aria-hidden="true"
                        />
                        <span aria-live="polite">{t('loading')}</span>
                      </>
                    ) : (
                      <>
                        {nextLabel || t('next')}
                        {stepNumber < 14 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>

              {/* Visible keyboard hint - shown on focus-within */}
              <p
                className="hidden md:block mt-3 text-center text-xs text-muted-foreground/60 opacity-0 group-focus-within/nav:opacity-100 transition-opacity duration-200"
                aria-hidden="true"
              >
                {tA11y('keyboardNavHintShort').replace('Alt', isMac ? 'Option' : 'Alt')}
              </p>
            </nav>
          )}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}

// Mobile-specific progress component
export function MobileProgressBar({
  currentStep,
  totalSteps = 14
}: {
  currentStep: number
  totalSteps?: number
}) {
  const progressPercentage = (currentStep / totalSteps) * 100
  
  return (
    <div className="md:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium">
          {Math.round(progressPercentage)}%
        </span>
      </div>
      <Progress value={progressPercentage} className="h-1" />
    </div>
  )
}
