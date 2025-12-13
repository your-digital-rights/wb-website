'use client'

import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Eye, Link } from 'lucide-react'

import { DynamicList } from '@/components/onboarding/DynamicList'
import { TextareaInput } from '@/components/onboarding/form-fields/TextareaInput'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'

export function Step7VisualInspiration({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.7')
  const { control, setValue, watch } = form

  // URL validator function
  const validateUrl = (value: string): { isValid: boolean; errorMessage?: string } => {
    if (!value || value.trim() === '') {
      return { isValid: false, errorMessage: 'URL cannot be empty' }
    }

    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          isValid: false,
          errorMessage: 'URL must start with http:// or https://'
        }
      }
      return { isValid: true }
    } catch {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid URL (e.g., https://example.com)'
      }
    }
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
          <Eye className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Website Inspirations */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Link className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('inspirations.title')}</h2>
              <Badge variant="outline" className="ml-auto">
                {t('inspirations.optional')}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-blue-700">{t('inspirations.guidelines.title')}</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.layout')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.colors')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.typography')}
                    </li>
                  </ul>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.navigation')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.images')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      {t('inspirations.guidelines.overall')}
                    </li>
                  </ul>
                </div>
              </div>

              {/* URL Collection */}
              <Controller
                name="websiteReferences"
                control={control}
                render={({ field }) => (
                  <DynamicList
                    label={t('inspirations.urls.label')}
                    items={(field.value || []).map((url: string, index: number) => ({
                      id: `inspiration-${index}`,
                      value: url,
                      order: index
                    }))}
                    placeholder={t('inspirations.urls.placeholder')}
                    addButtonText={t('inspirations.urls.addButton')}
                    hint="Add up to 3 websites that inspire you. Include competitors, similar businesses, or any sites you find well-designed."
                    error={errors.websiteReferences?.message}
                    maxItems={3}
                    minItems={0}
                    itemPrefix="🌐"
                    showCounter={false}
                    allowReorder
                    allowEdit
                    disabled={isLoading}
                    validator={validateUrl}
                    onItemsChange={(items) => {
                      const urls = items.map(item => item.value)
                      field.onChange(urls)
                    }}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>



      {/* Design Analysis Insight */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-600" />
              <h4 className="font-semibold text-orange-700">{t('analysis.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h5 className="font-medium text-orange-700">{t('analysis.layout.title')}</h5>
                <p className="text-orange-600 text-xs">{t('analysis.layout.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-orange-700">{t('analysis.content.title')}</h5>
                <p className="text-orange-600 text-xs">{t('analysis.content.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-orange-700">{t('analysis.interaction.title')}</h5>
                <p className="text-orange-600 text-xs">{t('analysis.interaction.description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Helper Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-sm text-muted-foreground space-y-2"
      >
        <p>{t('tips.title')}</p>
        {/* Desktop: inline with bullet separators */}
        <div className="hidden sm:flex flex-wrap justify-center gap-4">
          <span>{t('tips.diverse')}</span>
          <span>•</span>
          <span>{t('tips.specific')}</span>
          <span>•</span>
          <span>{t('tips.relevant')}</span>
        </div>
        {/* Mobile: vertical list with bullets on the left */}
        <ul className="sm:hidden space-y-1 text-left max-w-xs mx-auto">
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.diverse')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.specific')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.relevant')}</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}