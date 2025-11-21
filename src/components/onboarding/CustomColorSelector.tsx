'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Palette, X } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

  // Initialize colors with empty values if not provided
  // Order matches color_palettes.json: [background, primary, secondary, accent]
  const defaultColors: CustomColor[] = [
    { name: 'background', value: undefined },
    { name: 'primary', value: undefined },
    { name: 'secondary', value: undefined },
    { name: 'accent', value: undefined }
  ]

  const currentColors = colors.length === 4 ? colors : defaultColors

  const handleColorChange = (colorName: string, newValue: string) => {
    const updatedColors = currentColors.map((color) =>
      color.name === colorName ? { ...color, value: newValue } : color
    )
    onChange(updatedColors)
  }

  const handleHexInputChange = (colorName: string, hexValue: string) => {
    // Allow typing partial hex values
    if (hexValue === '' || /^#[0-9A-Fa-f]{0,6}$/.test(hexValue)) {
      handleColorChange(colorName, hexValue)
    }
  }

  const handleClearColor = (colorName: string) => {
    const updatedColors = currentColors.map((color) =>
      color.name === colorName ? { ...color, value: undefined } : color
    )
    onChange(updatedColors)
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
            const hasValue = !!color.value

            return (
              <div key={color.name} className="space-y-2">
                <Label className="text-sm font-medium capitalize">
                  {t(`labels.${color.name}`)}
                </Label>

                <div className="relative">
                  {/* Hidden Native Color Picker Input */}
                  <input
                    type="color"
                    id={`color-picker-${color.name}`}
                    value={color.value || '#000000'}
                    onChange={(e) => handleColorChange(color.name, e.target.value)}
                    className="sr-only"
                  />

                  {/* Color Display Button - triggers native picker */}
                  <label
                    htmlFor={`color-picker-${color.name}`}
                    className={cn(
                      "w-full h-20 rounded-lg border-2 transition-all cursor-pointer block",
                      "hover:scale-105 hover:shadow-md",
                      "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                      hasValue
                        ? "border-primary"
                        : "border-dashed border-muted-foreground/30 bg-muted/20"
                    )}
                    style={{
                      backgroundColor: hasValue ? color.value : 'transparent'
                    }}
                  >
                    {!hasValue && (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Palette className="w-5 h-5 mb-1" />
                        <span className="text-xs">{t('empty')}</span>
                      </div>
                    )}
                  </label>

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
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors shadow-md z-10"
                      aria-label={t('clear')}
                    >
                      <X className="w-3 h-3" />
                    </motion.button>
                  )}
                </div>

                {/* Hex Input Field - Always Visible */}
                <Input
                  type="text"
                  value={color.value || ''}
                  onChange={(e) => handleHexInputChange(color.name, e.target.value)}
                  placeholder="#000000"
                  className="w-full text-sm font-mono text-center"
                />
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
