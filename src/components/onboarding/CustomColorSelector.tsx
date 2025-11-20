'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, X } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CustomColor {
  name: 'primary' | 'secondary' | 'accent' | 'background'
  value?: string // Hex color value
}

interface CustomColorSelectorProps {
  colors: CustomColor[]
  onChange: (colors: CustomColor[]) => void
  className?: string
  renderWithoutCard?: boolean
}

export function CustomColorSelector({
  colors,
  onChange,
  className,
  renderWithoutCard = false
}: CustomColorSelectorProps) {
  const t = useTranslations('onboarding.steps.10.customColors')
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null)

  // Initialize colors with empty values if not provided
  const defaultColors: CustomColor[] = [
    { name: 'primary', value: undefined },
    { name: 'secondary', value: undefined },
    { name: 'accent', value: undefined },
    { name: 'background', value: undefined }
  ]

  const currentColors = colors.length === 4 ? colors : defaultColors

  const handleColorChange = (colorName: string, newValue: string) => {
    const updatedColors = currentColors.map((color) =>
      color.name === colorName ? { ...color, value: newValue } : color
    )
    onChange(updatedColors)
  }

  // Validate and clean up color value when picker is closed
  const closeColorPickerWithValidation = () => {
    // Find the active color
    const activeColor = currentColors.find(c => c.name === activeColorPicker)

    if (activeColor && activeColor.value) {
      const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(activeColor.value)

      // If invalid, clear the color
      if (!isValidHex) {
        handleClearColor(activeColorPicker!)
      }
    }

    setActiveColorPicker(null)
  }

  const handleClearColor = (colorName: string) => {
    const updatedColors = currentColors.map((color) =>
      color.name === colorName ? { ...color, value: undefined } : color
    )
    onChange(updatedColors)
    setActiveColorPicker(null)
  }

  const openColorPicker = (colorName: string) => {
    setActiveColorPicker(colorName)
  }

  const content = (
    <>
      {!renderWithoutCard && (
        <>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              {t('title')}
            </h3>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </>
      )}

      {/* Color Selectors Grid */}
      <div className={cn("space-y-4", renderWithoutCard ? "" : "")}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentColors.map((color) => {
            const isActive = activeColorPicker === color.name
            const hasValue = !!color.value

            return (
              <div key={color.name} className="space-y-2 relative">
                <Label className="text-sm font-medium capitalize">
                  {t(`labels.${color.name}`)}
                </Label>

                <div className="relative">
                  {/* Color Display Button */}
                  <button
                    type="button"
                    onClick={() => openColorPicker(color.name)}
                    className={cn(
                      "w-full h-20 rounded-lg border-2 transition-all",
                      "hover:scale-105 hover:shadow-md",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      hasValue
                        ? "border-primary"
                        : "border-dashed border-muted-foreground/30 bg-muted/20"
                    )}
                    style={{
                      backgroundColor: hasValue ? color.value : 'transparent'
                    }}
                  >
                    {!hasValue && (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Palette className="w-5 h-5 mb-1" />
                        <span className="text-xs">{t('empty')}</span>
                      </div>
                    )}
                  </button>

                  {/* Clear Button */}
                  {hasValue && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleClearColor(color.name)
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md"
                      aria-label={t('clear')}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  )}

                  {/* Color Value Display */}
                  {hasValue && (
                    <div className="mt-1 text-xs text-center font-mono text-muted-foreground">
                      {color.value}
                    </div>
                  )}
                </div>

                {/* Native Color Picker (Hidden) */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-50 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium capitalize">
                            {t(`labels.${color.name}`)}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={closeColorPickerWithValidation}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>

                        <input
                          type="color"
                          value={color.value || '#000000'}
                          onChange={(e) => handleColorChange(color.name, e.target.value)}
                          className="w-full h-32 rounded cursor-pointer"
                        />

                        <input
                          type="text"
                          value={color.value || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === '') {
                              handleColorChange(color.name, value)
                            }
                          }}
                          placeholder="#000000"
                          className="w-full px-3 py-2 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleClearColor(color.name)}
                            className="flex-1"
                          >
                            {t('clear')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={closeColorPickerWithValidation}
                            className="flex-1"
                          >
                            {t('done')}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {!renderWithoutCard && (
          <p className="text-xs text-muted-foreground italic">
            {t('hint')}
          </p>
        )}
      </div>
    </>
  )

  if (renderWithoutCard) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={cn("border-2 border-dashed", className)}>
      <CardContent className="pt-6 space-y-4">
        {content}
      </CardContent>
    </Card>
  )
}
