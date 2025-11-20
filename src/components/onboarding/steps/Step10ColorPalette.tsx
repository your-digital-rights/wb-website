'use client'

import { useState, useMemo, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Palette, Eye, Search, X } from 'lucide-react'

import { ColorPalette } from '@/components/onboarding/ColorPalette'
import { CustomColorSelector } from '@/components/onboarding/CustomColorSelector'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StepComponentProps } from './index'
import { getColorPalettes } from '@/lib/color-palettes'
import colorPalettesData from '@/data/color_palettes.json'

interface CustomColor {
  name: 'primary' | 'secondary' | 'accent' | 'background'
  value?: string
}

export function Step10ColorPalette({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.10')
  const locale = useLocale()
  const { control, setValue, watch } = form
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('')

  // Watch the current color palette value (array of hex colors)
  const currentColorPalette = watch('colorPalette') as string[] | undefined

  // Load color palettes based on current locale
  const allColorPalettes = getColorPalettes(locale)

  // Initialize custom colors from form data or empty
  const [customColors, setCustomColors] = useState<CustomColor[]>(() => {
    const colors = currentColorPalette || []
    return [
      { name: 'primary', value: colors[0] },
      { name: 'secondary', value: colors[1] },
      { name: 'accent', value: colors[2] },
      { name: 'background', value: colors[3] }
    ]
  })

  // Sync custom colors with form data on mount
  useEffect(() => {
    if (currentColorPalette && currentColorPalette.length > 0) {
      setCustomColors([
        { name: 'primary', value: currentColorPalette[0] },
        { name: 'secondary', value: currentColorPalette[1] },
        { name: 'accent', value: currentColorPalette[2] },
        { name: 'background', value: currentColorPalette[3] }
      ])
    }
  }, []) // Run only on mount

  // Filter palettes based on search query
  const filteredPalettes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allColorPalettes
    }

    const query = searchQuery.toLowerCase().trim()

    return allColorPalettes.filter((palette, index) => {
      const rawPalette = colorPalettesData[index]

      // Search in palette names (both locales)
      if (rawPalette.palette_name_en.toLowerCase().includes(query) ||
          rawPalette.palette_name_it.toLowerCase().includes(query)) {
        return true
      }

      // Search in descriptions (both locales)
      if (rawPalette.description_en.toLowerCase().includes(query) ||
          rawPalette.description_it.toLowerCase().includes(query)) {
        return true
      }

      // Search in main colors (both locales)
      const mainColorsEn = rawPalette.main_colors_en.some(color =>
        color.toLowerCase().includes(query)
      )
      const mainColorsIt = rawPalette.main_colors_it.some(color =>
        color.toLowerCase().includes(query)
      )

      return mainColorsEn || mainColorsIt
    })
  }, [searchQuery, allColorPalettes, locale])

  // Handle palette selection - populates custom colors
  const handlePaletteSelection = (paletteId: string) => {
    setSelectedPaletteId(paletteId)

    // Find the selected palette
    const selectedPalette = allColorPalettes.find(p => p.id === paletteId)

    if (selectedPalette && selectedPalette.preview) {
      // Populate custom colors with palette preview colors
      const newCustomColors: CustomColor[] = [
        { name: 'primary', value: selectedPalette.preview.primary },
        { name: 'secondary', value: selectedPalette.preview.secondary },
        { name: 'accent', value: selectedPalette.preview.accent },
        { name: 'background', value: selectedPalette.preview.background }
      ]
      setCustomColors(newCustomColors)

      // Update form with color values array
      const colorValues = [
        selectedPalette.preview.primary,
        selectedPalette.preview.secondary,
        selectedPalette.preview.accent,
        selectedPalette.preview.background,
        // Include any additional colors from the palette
        ...selectedPalette.colors.slice(4).map(c => c.hex)
      ]
      setValue('colorPalette', colorValues, { shouldValidate: true })
    }
  }

  // Handle custom color changes
  const handleCustomColorsChange = (newColors: CustomColor[]) => {
    setCustomColors(newColors)

    // Convert custom colors to array of hex values (filter out empty values)
    const colorValues = newColors
      .map(c => c.value)
      .filter((v): v is string => !!v)

    setValue('colorPalette', colorValues, { shouldValidate: true })
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
          <Palette className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Custom Color Selector - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <CustomColorSelector
          colors={customColors}
          onChange={handleCustomColorsChange}
        />
      </motion.div>

      {/* Color Palette Selection */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('selection.title')}</h2>
              <Badge variant="secondary" className="ml-auto">
                {t('selection.optional')}
              </Badge>
            </div>

            {/* Search Bar */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={locale === 'it'
                    ? 'Cerca palette per nome, colore o descrizione...'
                    : 'Search palettes by name, color, or description...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {searchQuery && (
                <p className="text-sm text-muted-foreground">
                  {locale === 'it'
                    ? `${filteredPalettes.length} palette ${filteredPalettes.length === 1 ? 'trovata' : 'trovate'}`
                    : `${filteredPalettes.length} ${filteredPalettes.length === 1 ? 'palette' : 'palettes'} found`}
                </p>
              )}
            </div>

            <ColorPalette
              label=""
              options={filteredPalettes}
              value={selectedPaletteId}
              onSelectionChange={handlePaletteSelection}
              error={(errors as any).colorPalette?.message}
              showNames
              showDescriptions
              showCategories={false}
              showPreview
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Color Psychology */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-600" />
              <h4 className="font-semibold text-violet-700">{t('psychology.title')}</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h5 className="font-medium text-violet-700">{t('psychology.emotional.title')}</h5>
                <ul className="space-y-1 text-violet-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.emotional.trust')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.emotional.energy')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.emotional.calm')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.emotional.luxury')}
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-violet-700">{t('psychology.business.title')}</h5>
                <ul className="space-y-1 text-violet-600">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.business.conversion')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.business.branding')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.business.accessibility')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-violet-600 mt-2 flex-shrink-0" />
                    {t('psychology.business.recognition')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Color Accessibility Note */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-600" />
              <h4 className="font-medium text-amber-700">{t('accessibility.title')}</h4>
            </div>

            <p className="text-sm text-amber-600">
              {t('accessibility.description')}
            </p>

            <ul className="text-xs text-amber-600 space-y-1">
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                {t('accessibility.contrast')}
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                {t('accessibility.colorBlind')}
              </li>
              <li className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-600 mt-2 flex-shrink-0" />
                {t('accessibility.consistency')}
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
        <div className="flex flex-wrap justify-center gap-4">
          <span>{t('tips.emotion')}</span>
          <span>•</span>
          <span>{t('tips.industry')}</span>
          <span>•</span>
          <span>{t('tips.accessible')}</span>
        </div>
      </motion.div>
    </div>
  )
}
