'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { Languages, Search, X, Check, Globe, Users } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { StepComponentProps } from './index'
import {
  EUROPEAN_LANGUAGES,
  getLanguageName
} from '@/data/european-languages'
import { Locale } from '@/lib/i18n'

export function Step13AddOns({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.13')
  const locale = useLocale() as Locale
  const { control, watch, getValues } = form

  const [searchQuery, setSearchQuery] = useState('')
  const [prices, setPrices] = useState<{
    basePackage: number   // euros
    languageAddOn: number // euros
  } | null>(null)

  // Watch selected languages
  const selectedLanguages = watch('additionalLanguages') || []

  // Fetch prices from Stripe on mount
  useEffect(() => {
    async function fetchPrices() {
      try {
        const response = await fetch('/api/stripe/prices')
        const data = await response.json()
        if (data.success) {
          setPrices({
            basePackage: data.data.basePackage.amount / 100,
            languageAddOn: data.data.languageAddOn.amount / 100
          })
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
        // Fallback to hardcoded prices
        setPrices({
          basePackage: 35,
          languageAddOn: 75
        })
      }
    }
    fetchPrices()
  }, [])

  // Filter languages based on search query
  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) {
      return EUROPEAN_LANGUAGES
    }

    const query = searchQuery.toLowerCase().trim()

    return EUROPEAN_LANGUAGES.filter((language) => {
      const nameEn = language.nameEn.toLowerCase()
      const nameIt = language.nameIt.toLowerCase()
      const code = language.code.toLowerCase()

      return nameEn.includes(query) ||
             nameIt.includes(query) ||
             code.includes(query)
    })
  }, [searchQuery])

  // Calculate pricing using Stripe prices
  const basePackagePrice = prices?.basePackage || 35
  const languageAddOnPrice = prices?.languageAddOn || 75
  const totalAddOnsPrice = selectedLanguages.length * languageAddOnPrice

  // Toggle language selection
  const toggleLanguage = (
    languageCode: string,
    currentValue: string[],
    onChange: (value: string[]) => void
  ) => {
    const currentSelection = [...currentValue]
    const index = currentSelection.indexOf(languageCode)

    if (index > -1) {
      // Remove language
      currentSelection.splice(index, 1)
    } else {
      // Add language
      currentSelection.push(languageCode)
    }

    onChange(currentSelection)
  }

  // Clear all selections
  const clearAll = (onChange: (value: string[]) => void) => {
    onChange([])
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
          <Languages className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">
            {t('heading')}
          </h2>
        </div>

        {/* Included Languages Badge */}
        <div className="flex justify-center">
          <Badge variant="secondary" className="px-4 py-2">
            <Globe className="w-4 h-4 mr-2" />
            {t('includedLanguages')}
          </Badge>
        </div>
      </motion.div>

      {/* Pricing Summary - Always visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Selected Languages Count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {selectedLanguages.length === 0
                      ? t('availableLanguages', { count: EUROPEAN_LANGUAGES.length })
                      : t('selectedCount', { count: selectedLanguages.length })
                    }
                  </span>
                </div>
                <Controller
                  name="additionalLanguages"
                  control={control}
                  render={({ field }) => (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => clearAll(field.onChange)}
                      disabled={selectedLanguages.length === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {t('clearAll')}
                    </Button>
                  )}
                />
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('basePackage')}
                  </span>
                  <span className="font-medium">€{basePackagePrice}/month</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedLanguages.length} × {t('pricePerLanguage')}
                  </span>
                  <span className="font-medium">€{totalAddOnsPrice}</span>
                </div>
              </div>

              {/* Total Price (First Month) */}
              <div className="flex justify-between pt-4 border-t">
                <span className="font-semibold">{t('totalFirstMonth')}</span>
                <span className="text-xl font-bold text-primary">
                  €{basePackagePrice + totalAddOnsPrice}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Language Selection Grid */}
      <Controller
        name={"additionalLanguages" as any}
        control={control}
        render={({ field }) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {filteredLanguages.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{t('noResults')}</p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setSearchQuery('')}
                    className="mt-2"
                  >
                    {t('clearSearch')}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLanguages.map((language) => {
                  const isSelected = selectedLanguages.includes(language.code)

                  return (
                    <Card
                      key={language.code}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-2 border-primary bg-primary/5'
                          : 'border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const currentValue = getValues('additionalLanguages') || []
                        toggleLanguage(language.code, currentValue, field.onChange)
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-foreground truncate">
                                {getLanguageName(language.code, locale)}
                              </h3>
                              {isSelected && (
                                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{language.speakers}M {t('speakers')}</span>
                            </div>
                          </div>
                          <Checkbox
                            checked={isSelected}
                            aria-label={t('selectLanguage', {
                              language: getLanguageName(language.code, locale)
                            })}
                            className="mt-1 pointer-events-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Error Message */}
            {errors.additionalLanguages && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-destructive"
              >
                {errors.additionalLanguages.message || 'Invalid selection'}
              </motion.p>
            )}
          </motion.div>
        )}
      />

      {/* Info Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center text-sm text-muted-foreground"
      >
        <p>
          {t('languageAddonsInfo')}
        </p>
      </motion.div>
    </div>
  )
}
