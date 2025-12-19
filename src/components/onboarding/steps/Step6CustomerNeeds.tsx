'use client'

import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { HelpCircle, Heart, Target } from 'lucide-react'

import { TextareaInput } from '@/components/onboarding/form-fields/TextareaInput'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'

export function Step6CustomerNeeds({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.6')
  const { control } = form

  // Translate error messages from Zod schema
  const getTranslatedError = (fieldError: { message?: string } | undefined): string | undefined => {
    if (!fieldError?.message) return undefined

    // Map Zod error messages to translated messages
    if (fieldError.message.includes('at least 30 characters')) {
      return t('problems.validation.minLength')
    }
    if (fieldError.message.includes('exceed 400 characters')) {
      return t('problems.validation.maxLength')
    }

    return fieldError.message
  }

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Target className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Customer Problems */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('problems.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('problems.required')}
              </Badge>
            </div>

            <div className="space-y-4">
              <Controller
                name="customerProblems"
                control={control}
                render={({ field }) => (
                  <TextareaInput
                    {...field}
                    label={t('problems.input.label')}
                    placeholder={t('problems.input.placeholder')}
                    hint={t('problems.input.hint')}
                    error={getTranslatedError(errors.customerProblems)}
                    required
                    disabled={isLoading}
                    maxLength={400}
                    minLength={30}
                    showCharacterCount
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>


      {/* Customer Delight */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('delight.title')}</h2>
              <Badge variant="outline" className="ml-auto">
                {t('delight.optional')}
              </Badge>
            </div>

            <div className="space-y-4">
              <Controller
                name="customerDelight"
                control={control}
                render={({ field }) => (
                  <TextareaInput
                    {...field}
                    label={t('delight.input.label')}
                    placeholder={t('delight.input.placeholder')}
                    hint={t('delight.input.hint')}
                    error={errors.customerDelight?.message}
                    disabled={isLoading}
                    maxLength={400}
                    showCharacterCount
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Customer Journey Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-700">{t('insights.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h5 className="font-medium text-blue-700">{t('insights.awareness.title')}</h5>
                <p className="text-blue-600 text-xs">{t('insights.awareness.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-blue-700">{t('insights.consideration.title')}</h5>
                <p className="text-blue-600 text-xs">{t('insights.consideration.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-blue-700">{t('insights.decision.title')}</h5>
                <p className="text-blue-600 text-xs">{t('insights.decision.description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Helper Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-sm text-muted-foreground space-y-2"
      >
        <p>{t('tips.title')}</p>
        {/* Desktop: inline with bullet separators */}
        <div className="hidden sm:flex flex-wrap justify-center gap-4">
          <span>{t('tips.specific')}</span>
          <span>•</span>
          <span>{t('tips.customer')}</span>
          <span>•</span>
          <span>{t('tips.emotional')}</span>
        </div>
        {/* Mobile: vertical list with bullets on the left */}
        <ul className="sm:hidden space-y-1 text-left max-w-xs mx-auto">
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.specific')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.customer')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.emotional')}</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}