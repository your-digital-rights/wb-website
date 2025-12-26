'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Camera, Image as ImageIcon, Sparkles } from 'lucide-react'

import { ImageGrid } from '@/components/onboarding/ImageGrid'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'

export function Step9ImageStyle({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.9')
  const { control } = form

  // Image style options with translated content
  const imageStyleOptions = useMemo(() => [
    {
      id: 'photorealistic',
      title: t('styles.photorealistic.title'),
      description: t('styles.photorealistic.description'),
      imageUrl: '/images/onboarding/image-photorealistic.png',
      category: t('styles.photorealistic.title'),
      tags: [
        t('styles.photorealistic.tags.highQuality'),
        t('styles.photorealistic.tags.professional'),
        t('styles.photorealistic.tags.clean'),
        t('styles.photorealistic.tags.authentic')
      ],
      premium: false
    },
    {
      id: 'flat-illustration',
      title: t('styles.flatIllustration.title'),
      description: t('styles.flatIllustration.description'),
      imageUrl: '/images/onboarding/image-flat-illustration.png',
      category: t('styles.flatIllustration.title'),
      tags: [
        t('styles.flatIllustration.tags.vector'),
        t('styles.flatIllustration.tags.clean'),
        t('styles.flatIllustration.tags.contemporary'),
        t('styles.flatIllustration.tags.scalable')
      ],
      premium: false
    },
    {
      id: 'sketch',
      title: t('styles.sketch.title'),
      description: t('styles.sketch.description'),
      imageUrl: '/images/onboarding/image-sketch.png',
      category: t('styles.sketch.title'),
      tags: [
        t('styles.sketch.tags.artistic'),
        t('styles.sketch.tags.personal'),
        t('styles.sketch.tags.creative'),
        t('styles.sketch.tags.unique')
      ],
      premium: true
    },
    {
      id: '3d',
      title: t('styles.3d.title'),
      description: t('styles.3d.description'),
      imageUrl: '/images/onboarding/image-3d.png',
      category: t('styles.3d.title'),
      tags: [
        t('styles.3d.tags.dynamic'),
        t('styles.3d.tags.modern'),
        t('styles.3d.tags.dimensional'),
        t('styles.3d.tags.engaging')
      ],
      premium: false
    },
    {
      id: 'line-art',
      title: t('styles.lineArt.title'),
      description: t('styles.lineArt.description'),
      imageUrl: '/images/onboarding/image-line-art.png',
      category: t('styles.lineArt.title'),
      tags: [
        t('styles.lineArt.tags.simple'),
        t('styles.lineArt.tags.clean'),
        t('styles.lineArt.tags.focused'),
        t('styles.lineArt.tags.elegant')
      ],
      premium: false
    },
    {
      id: 'collage',
      title: t('styles.collage.title'),
      description: t('styles.collage.description'),
      imageUrl: '/images/onboarding/image-collage.png',
      category: t('styles.collage.title'),
      tags: [
        t('styles.collage.tags.creative'),
        t('styles.collage.tags.versatile'),
        t('styles.collage.tags.artistic'),
        t('styles.collage.tags.storytelling')
      ],
      premium: false
    }
  ], [t])

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Camera className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Image Style Selection */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('selection.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('selection.required')}
              </Badge>
            </div>

            <Controller
              name="imageStyle"
              control={control}
              render={({ field }) => (
                <ImageGrid
                  label=""
                  options={imageStyleOptions}
                  value={field.value}
                  onSelectionChange={field.onChange}
                  error={errors.imageStyle?.message}
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

      {/* Visual Impact Guide */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-700">{t('impact.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h5 className="font-medium text-green-700">{t('impact.psychology.title')}</h5>
                <ul className="space-y-1 text-green-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.psychology.trust')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.psychology.emotion')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.psychology.attention')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.psychology.memory')}
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-green-700">{t('impact.technical.title')}</h5>
                <ul className="space-y-1 text-green-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.technical.loading')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.technical.scalability')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.technical.responsive')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                    {t('impact.technical.accessibility')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content Strategy Note */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-blue-700">{t('strategy.title')}</h4>
            </div>
            
            <p className="text-sm text-blue-600">
              {t('strategy.description')}
            </p>
            
            <ul className="text-xs text-blue-600 space-y-1">
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                {t('strategy.consistency')}
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                {t('strategy.quality')}
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                {t('strategy.relevance')}
              </li>
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Helper Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="text-center text-sm text-muted-foreground space-y-2"
      >
        <p>{t('tips.title')}</p>
        {/* Desktop: inline with bullet separators */}
        <div className="hidden sm:flex flex-nowrap justify-center gap-3 text-xs lg:text-sm whitespace-nowrap">
          <span>{t('tips.brand')}</span>
          <span>•</span>
          <span>{t('tips.audience')}</span>
          <span>•</span>
          <span>{t('tips.quality')}</span>
        </div>
        {/* Mobile: vertical list with bullets on the left */}
        <ul className="sm:hidden space-y-1 text-left max-w-xs mx-auto">
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.brand')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.audience')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.quality')}</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
