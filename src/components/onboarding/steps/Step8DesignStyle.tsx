'use client'

import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Palette, Layout, Sparkles } from 'lucide-react'

import { ImageGrid } from '@/components/onboarding/ImageGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'

// Design style options with sample images
const designStyleOptions = [
  {
    id: 'minimalist',
    title: 'Minimalist',
    description: 'Clean lines, plenty of whitespace, sophisticated simplicity',
    imageUrl: '/images/onboarding/website-minimalist.png',
    category: 'Minimalist',
    tags: ['Clean', 'Simple', 'Professional', 'Spacious'],
    premium: false
  },
  {
    id: 'corporate',
    title: 'Corporate',
    description: 'Business-focused design with trust-building elements',
    imageUrl: '/images/onboarding/website-corporate.png',
    category: 'Corporate',
    tags: ['Professional', 'Trustworthy', 'Corporate', 'Structured'],
    premium: false
  },
  {
    id: 'bold',
    title: 'Bold',
    description: 'Dynamic layouts with vibrant colors and creative elements',
    imageUrl: '/images/onboarding/website-bold.png',
    category: 'Bold',
    tags: ['Dynamic', 'Vibrant', 'Artistic', 'Expressive'],
    premium: false
  },
  {
    id: 'playful',
    title: 'Playful',
    description: 'Fun and engaging design with playful elements',
    imageUrl: '/images/onboarding/website-playful.png',
    category: 'Playful',
    tags: ['Fun', 'Engaging', 'Friendly', 'Creative'],
    premium: false
  },
  {
    id: 'editorial',
    title: 'Editorial',
    description: 'Magazine-style layout with rich typography and content focus',
    imageUrl: '/images/onboarding/website-editorial.png',
    category: 'Editorial',
    tags: ['Editorial', 'Typography', 'Content', 'Reading'],
    premium: false
  },
  {
    id: 'retro',
    title: 'Retro',
    description: 'Vintage-inspired design with nostalgic elements',
    imageUrl: '/images/onboarding/website-retro.png',
    category: 'Retro',
    tags: ['Retro', 'Nostalgic', 'Classic', 'Unique'],
    premium: false
  }
]

export function Step8DesignStyle({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.8')
  const { control } = form

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Layout className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Style Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('selection.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('selection.required')}
              </Badge>
            </div>

            <Controller
              name="designStyle"
              control={control}
              render={({ field }) => (
                <ImageGrid
                  label=""
                  options={designStyleOptions}
                  value={field.value}
                  onSelectionChange={field.onChange}
                  error={errors.designStyle?.message}
                  multiple={false}
                  columns={2}
                  aspectRatio="landscape"
                  showTitles
                  showDescriptions
                  showCategories={false}
                />
              )}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Style Characteristics */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <h4 className="font-semibold text-indigo-700">{t('characteristics.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h5 className="font-medium text-indigo-700">{t('characteristics.visual.title')}</h5>
                <ul className="space-y-1 text-indigo-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.visual.layout')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.visual.typography')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.visual.spacing')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.visual.elements')}
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-indigo-700">{t('characteristics.impact.title')}</h5>
                <ul className="space-y-1 text-indigo-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.impact.perception')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.impact.audience')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.impact.conversion')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-indigo-600 mt-2 flex-shrink-0" />
                    {t('characteristics.impact.branding')}
                  </li>
                </ul>
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
          <span>{t('tips.authentic')}</span>
          <span>•</span>
          <span>{t('tips.audience')}</span>
          <span>•</span>
          <span>{t('tips.flexible')}</span>
        </div>
        {/* Mobile: vertical list with bullets on the left */}
        <ul className="sm:hidden space-y-1 text-left max-w-xs mx-auto">
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.authentic')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.audience')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.flexible')}</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}