'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Check, AlertCircle, CheckCircle2, Palette } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Color {
  name: string
  hex: string
  rgb?: string
  hsl?: string
}

interface ColorPaletteOption {
  id: string
  name: string
  description?: string
  category?: string
  colors: Color[]
  preview?: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  tags?: string[]
}

interface ColorPaletteProps {
  label: string
  options: ColorPaletteOption[]
  value?: string
  defaultValue?: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  showNames?: boolean
  showDescriptions?: boolean
  showCategories?: boolean
  showPreview?: boolean
  className?: string
  onSelectionChange?: (selected: string) => void
}

export function ColorPalette({
  label,
  options,
  value,
  defaultValue,
  error,
  hint,
  success,
  required = false,
  showNames = true,
  showDescriptions = false,
  showCategories = false,
  showPreview = true,
  className,
  onSelectionChange
}: ColorPaletteProps) {
  const t = useTranslations('forms.colorPalette')

  const [selectedId, setSelectedId] = useState<string>(value || defaultValue || '')

  const hasError = !!error
  const hasSuccess = !!success && !hasError

  // Update selected ID when external value changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedId(value)
    }
  }, [value])

  // Handle selection
  const handleSelection = (optionId: string) => {
    // Don't allow deselection - once a palette is selected, user must pick another one
    // This prevents accidental deselection by clicking the same card twice
    setSelectedId(optionId)
    onSelectionChange?.(optionId)
  }


  // Group options by category
  const groupedOptions = showCategories 
    ? options.reduce((groups, option) => {
        const category = option.category || t('uncategorized')
        if (!groups[category]) {
          groups[category] = []
        }
        groups[category].push(option)
        return groups
      }, {} as Record<string, ColorPaletteOption[]>)
    : { [t('all')]: options }

  const isSelected = (optionId: string) => selectedId === optionId

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="space-y-2">
        <Label 
          className={cn(
            "text-sm font-medium",
            hasError && "text-destructive",
            hasSuccess && "text-green-600"
          )}
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label={t('required')}>
              *
            </span>
          )}
        </Label>
      </div>

      {/* Color Palettes */}
      <div className="space-y-6">
        {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
          <div key={category} className="space-y-3">
            {/* Category Header */}
            {showCategories && Object.keys(groupedOptions).length > 1 && (
              <h4 className="text-sm font-medium text-muted-foreground">
                {category}
              </h4>
            )}

            {/* Palette Grid - Scrollable with 2 rows visible */}
            <div className="h-[480px] overflow-y-auto pr-2 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {categoryOptions.map((option, index) => {
                const selected = isSelected(option.id)

                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      delay: index * 0.05,
                      duration: 0.2 
                    }}
                  >
                    <Card 
                      className={cn(
                        "group cursor-pointer transition-all duration-200",
                        "hover:shadow-lg hover:scale-[1.02]",
                        selected && "ring-2 ring-primary shadow-lg"
                      )}
                      onClick={() => handleSelection(option.id)}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Palette Name & Description */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            {showNames && (
                              <h4 className="text-sm font-medium">{option.name}</h4>
                            )}
                            
                            {/* Selection Indicator */}
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                              selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                            )}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          
                          {showDescriptions && option.description && (
                            <p className="text-xs text-muted-foreground">
                              {option.description}
                            </p>
                          )}
                        </div>

                        {/* Color Swatches */}
                        <div className="grid grid-cols-5 gap-1 rounded-md overflow-hidden">
                          {option.colors.map((color, colorIndex) => (
                            <div
                              key={color.hex}
                              className="aspect-square"
                              style={{ backgroundColor: color.hex }}
                              title={`${color.name}: ${color.hex}`}
                            />
                          ))}
                        </div>

                        {/* Color Names */}
                        <div className="text-xs text-muted-foreground">
                          <div className="flex flex-wrap gap-1">
                            {option.colors.slice(0, 3).map((color) => (
                              <Badge key={color.hex} variant="outline" className="text-[10px] h-5">
                                {color.name}
                              </Badge>
                            ))}
                            {option.colors.length > 3 && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                +{option.colors.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Preview Section */}
                        {showPreview && option.preview && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t pt-3"
                          >
                            <div className="text-xs text-muted-foreground mb-2">
                              {t('preview')}:
                            </div>
                            
                            {/* Mini Preview */}
                            <div 
                              className="rounded-md overflow-hidden border h-16 p-2 flex items-center justify-between"
                              style={{
                                backgroundColor: option.preview.background,
                                color: option.preview.text
                              }}
                            >
                              <div className="space-y-1">
                                <div 
                                  className="text-xs font-medium"
                                  style={{ color: option.preview.primary }}
                                >
                                  Primary Text
                                </div>
                                <div 
                                  className="text-[10px]"
                                  style={{ color: option.preview.secondary }}
                                >
                                  Secondary Text
                                </div>
                              </div>
                              
                              <div 
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: option.preview.accent }}
                              />
                            </div>
                          </motion.div>
                        )}

                        {/* Tags */}
                        {option.tags && option.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {option.tags.map((tag, index) => (
                              <Badge key={`${tag}-${index}`} variant="outline" className="text-[10px] h-5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Options State */}
      {options.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t('noPalettes')}</p>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-1">
        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-destructive flex items-center gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.p>
        )}

        {/* Success Message */}
        {success && !error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-green-600 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </motion.p>
        )}

        {/* Hint */}
        {hint && !error && !success && (
          <p className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}