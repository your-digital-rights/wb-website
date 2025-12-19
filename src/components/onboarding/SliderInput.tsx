'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SliderOption {
  key: string
  title?: string
  leftLabel: string
  rightLabel: string
  value: number
  description?: string
  examples?: {
    left: string[]
    right: string[]
  }
}

interface SliderInputProps {
  label: string
  options: SliderOption[]
  values?: Record<string, number>
  defaultValues?: Record<string, number>
  error?: string
  hint?: string
  success?: string
  required?: boolean
  showLabels?: boolean
  showExamples?: boolean
  className?: string
  onValuesChange?: (values: Record<string, number>) => void
  onSliderChange?: (key: string, value: number) => void
}

export function SliderInput({
  label,
  options,
  values,
  defaultValues = {},
  error,
  hint,
  success,
  required = false,
  showLabels = true,
  showExamples = false,
  className,
  onValuesChange,
  onSliderChange
}: SliderInputProps) {
  const t = useTranslations('forms.slider')
  
  // Initialize internal values
  const [internalValues, setInternalValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    
    options.forEach(option => {
      if (values?.[option.key] !== undefined) {
        initial[option.key] = values[option.key]
      } else if (defaultValues[option.key] !== undefined) {
        initial[option.key] = defaultValues[option.key]
      } else {
        initial[option.key] = option.value || 50 // Default to middle
      }
    })
    
    return initial
  })

  const hasError = !!error
  const hasSuccess = !!success && !hasError

  // Use ref to track if this is the initial render
  const isInitialRender = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Update internal values when external values change
  useEffect(() => {
    if (values) {
      setInternalValues(prev => ({ ...prev, ...values }))
    }
  }, [values])

  // Handle slider change
  const handleSliderChange = useCallback((key: string, newValue: number[]) => {
    const value = newValue[0]

    setInternalValues(prev => ({ ...prev, [key]: value }))
    onSliderChange?.(key, value)
  }, [onSliderChange])

  // Notify parent of value changes after state updates (debounced)
  useEffect(() => {
    // Skip the initial render to avoid infinite loops
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the onValuesChange call
    timeoutRef.current = setTimeout(() => {
      onValuesChange?.(internalValues)
    }, 100)

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [internalValues])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])



  // Get color based on value
  const getSliderColor = (value: number): string => {
    if (value <= 20) return 'hsl(var(--destructive))'
    if (value <= 40) return 'hsl(var(--yellow-500))'
    if (value <= 60) return 'hsl(var(--primary))'
    if (value <= 80) return 'hsl(var(--blue-500))'
    return 'hsl(var(--green-500))'
  }

  return (
    <div className={cn("space-y-6", className)}>
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

      {/* Sliders */}
      <div className="space-y-6">
        {options.map((option, index) => {
          const value = internalValues[option.key] ?? 50
          
          return (
            <motion.div
              key={option.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 space-y-4">
                {/* Slider Title & Description */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {option.title || option.key.charAt(0).toUpperCase() + option.key.slice(1)}
                    </h4>
                    <span className="text-xs text-muted-foreground font-mono">
                      {value}%
                    </span>
                  </div>
                  {option.description && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>

                {/* Labels */}
                {showLabels && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-left max-w-[45%]">
                      {option.leftLabel}
                    </span>
                    <span className="text-right max-w-[45%]">
                      {option.rightLabel}
                    </span>
                  </div>
                )}

                {/* Slider */}
                <div className="px-2">
                  <Slider
                    value={[value]}
                    onValueChange={(newValue) => handleSliderChange(option.key, newValue)}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                    style={{
                      '--slider-track-color': getSliderColor(value)
                    } as React.CSSProperties}
                    aria-label={`${option.key}: ${value < 50 ? option.leftLabel : option.rightLabel}, ${value}%`}
                    aria-valuetext={`${value}%, leaning towards ${value < 50 ? option.leftLabel : option.rightLabel}`}
                  />
                </div>


                {/* Examples */}
                {showExamples && option.examples && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-2 gap-4 pt-2 border-t"
                  >
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                        {option.leftLabel} examples:
                      </h5>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {option.examples.left.map((example, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[10px] mt-0.5">•</span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                        {option.rightLabel} examples:
                      </h5>
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {option.examples.right.map((example, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[10px] mt-0.5">•</span>
                            {example}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Summary */}
      <Card className="p-4 bg-muted/50">
        <h4 className="font-medium text-sm mb-3">{t('summary')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map(option => {
            const value = internalValues[option.key] ?? 50
            const isLeftLeaning = value < 50
            const strength = Math.abs(value - 50) * 2 // Convert to 0-100 scale

            return (
              <div key={option.key} className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {option.title || option.key.charAt(0).toUpperCase() + option.key.slice(1)}:
                </span>
                <span className="font-mono">
                  {isLeftLeaning ? option.leftLabel : option.rightLabel} ({strength.toFixed(0)}%)
                </span>
              </div>
            )
          })}
        </div>
      </Card>

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