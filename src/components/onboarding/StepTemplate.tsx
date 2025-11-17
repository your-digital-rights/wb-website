'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useOnboardingStore } from '@/stores/onboarding'
import { cn } from '@/lib/utils'

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
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()
  
  const { 
    autoSaveStatus, 
    isSessionExpired,
    checkSessionExpired,
    recoverSession
  } = useOnboardingStore()

  // Check for session expiration
  useEffect(() => {
    checkSessionExpired()
  }, [checkSessionExpired])

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

  // Auto-save indicator
  const renderAutoSaveIndicator = () => {
    if (autoSaveStatus === 'saving') {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Save className="h-4 w-4 animate-pulse" />
          {t('saving')}
        </div>
      )
    }
    
    if (autoSaveStatus === 'saved') {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          {t('saved')}
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Progress Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {t('step')} {stepNumber} {t('of')} 14
              </span>
              {renderAutoSaveIndicator()}
            </div>
            <div className="text-sm font-medium">
              {Math.round(progressPercentage)}%
            </div>
          </div>
          <Progress
            value={progressPercentage}
            className="h-2"
            aria-label={t('progressLabel', { step: stepNumber, total: 14 })}
          />
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stepNumber}
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
        >
          {/* Step Header */}
          <div className="text-center mb-8">
            <motion.h1
              className="text-3xl md:text-4xl font-bold mb-4 text-foreground"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
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
          </div>

          {/* Step Content */}
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
            <motion.div
              className="flex flex-col md:flex-row items-stretch md:items-center justify-between mt-8 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
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
                >
                  <ArrowLeft className="h-4 w-4" />
                  {previousLabel || t('previous')}
                </Button>
              </motion.div>

              {/* Step Indicators */}
              <div className="hidden md:flex items-center gap-2 order-2">
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    role="img"
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i < stepNumber
                        ? "bg-primary"
                        : i === stepNumber - 1
                          ? "bg-primary/60"
                          : "bg-muted-foreground/20"
                    )}
                    aria-label={
                      i < stepNumber
                        ? t('stepCompleted', { step: i + 1 })
                        : i === stepNumber - 1
                          ? t('stepCurrent', { step: i + 1 })
                          : t('stepUpcoming', { step: i + 1 })
                    }
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
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      {nextLabel || t('next')}
                      {stepNumber < 14 && <ArrowRight className="h-4 w-4" />}
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
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
