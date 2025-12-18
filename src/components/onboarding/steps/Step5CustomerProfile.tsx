'use client'

import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Heart, Brain, Zap } from 'lucide-react'

import { SliderInput } from '@/components/onboarding/SliderInput'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StepComponentProps } from './index'

export function Step5CustomerProfile({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.5')
  const { control, setValue, watch } = form

  const customerProfile = watch('customerProfile') || {
    budget: 50,
    style: 50,
    motivation: 50,
    decisionMaking: 50,
    loyalty: 50
  }

  // Customer profiling sliders configuration
  const sliderOptions = [
    {
      key: 'budget',
      title: t('profile.budget.title'),
      leftLabel: t('profile.budget.left'),
      rightLabel: t('profile.budget.right'),
      value: customerProfile.budget || 50,
      description: t('profile.budget.description'),
      examples: {
        left: [
          t('profile.budget.examples.left.price'),
          t('profile.budget.examples.left.discount'),
          t('profile.budget.examples.left.value')
        ],
        right: [
          t('profile.budget.examples.right.quality'),
          t('profile.budget.examples.right.premium'),
          t('profile.budget.examples.right.exclusive')
        ]
      }
    },
    {
      key: 'style',
      title: t('profile.style.title'),
      leftLabel: t('profile.style.left'),
      rightLabel: t('profile.style.right'),
      value: customerProfile.style || 50,
      description: t('profile.style.description'),
      examples: {
        left: [
          t('profile.style.examples.left.classic'),
          t('profile.style.examples.left.proven'),
          t('profile.style.examples.left.conservative')
        ],
        right: [
          t('profile.style.examples.right.innovative'),
          t('profile.style.examples.right.trendy'),
          t('profile.style.examples.right.cutting')
        ]
      }
    },
    {
      key: 'motivation',
      title: t('profile.motivation.title'),
      leftLabel: t('profile.motivation.left'),
      rightLabel: t('profile.motivation.right'),
      value: customerProfile.motivation || 50,
      description: t('profile.motivation.description'),
      examples: {
        left: [
          t('profile.motivation.examples.left.functional'),
          t('profile.motivation.examples.left.efficient'),
          t('profile.motivation.examples.left.practical')
        ],
        right: [
          t('profile.motivation.examples.right.memorable'),
          t('profile.motivation.examples.right.emotional'),
          t('profile.motivation.examples.right.inspiring')
        ]
      }
    },
    {
      key: 'decisionMaking',
      title: t('profile.decision.title'),
      leftLabel: t('profile.decision.left'),
      rightLabel: t('profile.decision.right'),
      value: customerProfile.decisionMaking || 50,
      description: t('profile.decision.description'),
      examples: {
        left: [
          t('profile.decision.examples.left.impulse'),
          t('profile.decision.examples.left.quick'),
          t('profile.decision.examples.left.instinct')
        ],
        right: [
          t('profile.decision.examples.right.research'),
          t('profile.decision.examples.right.compare'),
          t('profile.decision.examples.right.deliberate')
        ]
      }
    },
    {
      key: 'loyalty',
      title: t('profile.loyalty.title'),
      leftLabel: t('profile.loyalty.left'),
      rightLabel: t('profile.loyalty.right'),
      value: customerProfile.loyalty || 50,
      description: t('profile.loyalty.description'),
      examples: {
        left: [
          t('profile.loyalty.examples.left.deals'),
          t('profile.loyalty.examples.left.compare'),
          t('profile.loyalty.examples.left.switch')
        ],
        right: [
          t('profile.loyalty.examples.right.relationship'),
          t('profile.loyalty.examples.right.trust'),
          t('profile.loyalty.examples.right.consistent')
        ]
      }
    }
  ]

  const handleSliderValuesChange = (values: Record<string, number>) => {
    setValue('customerProfile', values as {
      budget: number
      style: number
      motivation: number
      decisionMaking: number
      loyalty: number
    })
  }

  const getProfileIcon = (key: string) => {
    const icons = {
      budget: <TrendingUp className="w-4 h-4" />,
      style: <Zap className="w-4 h-4" />,
      motivation: <Heart className="w-4 h-4" />,
      decision: <Brain className="w-4 h-4" />,
      loyalty: <Users className="w-4 h-4" />
    }
    return icons[key as keyof typeof icons] || <Users className="w-4 h-4" />
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
          <Users className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Customer Profile Sliders */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('profile.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('profile.required')}
              </Badge>
            </div>

            <Controller
              name="customerProfile"
              control={control}
              render={({ field }) => (
                <SliderInput
                  label=""
                  options={sliderOptions}
                  values={field.value || {}}
                  onValuesChange={(values) => {
                    field.onChange(values)
                    handleSliderValuesChange(values)
                  }}
                  error={errors.customerProfile?.message}
                  showLabels
                  showExamples
                />
              )}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Profile Insights */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">{t('insights.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <h5 className="font-medium text-primary">{t('insights.targeting.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.targeting.messaging')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.targeting.pricing')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.targeting.features')}
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-primary">{t('insights.optimization.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.optimization.layout')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.optimization.content')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('insights.optimization.calls')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

    </div>
  )
}