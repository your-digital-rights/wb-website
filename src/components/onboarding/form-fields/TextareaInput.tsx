'use client'

import { forwardRef, useState, useRef, useEffect, useId } from 'react'
import { useFormTranslation } from '@/hooks/useTranslationWithFallback'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  maxLength?: number
  minLength?: number
  showCharacterCount?: boolean
  autoResize?: boolean
  variant?: 'default' | 'floating'
}

export const TextareaInput = forwardRef<HTMLTextAreaElement, TextareaInputProps>(
  ({
    label,
    error,
    hint,
    success,
    required = false,
    maxLength,
    minLength,
    showCharacterCount = true,
    autoResize = true,
    variant = 'default',
    className,
    onChange,
    onBlur,
    onFocus,
    value,
    ...props
  }, ref) => {
    const { t } = useFormTranslation()
    const [characterCount, setCharacterCount] = useState(0)
    const [isFocused, setIsFocused] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const generatedId = useId()

    const inputId = props.id || `textarea-${generatedId}`
    const hasError = !!error
    const hasSuccess = !!success && !hasError

    // Auto-resize functionality
    const adjustHeight = (element: HTMLTextAreaElement) => {
      if (!autoResize) return
      
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }

    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setCharacterCount(newValue.length)
      
      if (autoResize) {
        adjustHeight(e.target)
      }
      
      onChange?.(e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true)
      onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false)
      onBlur?.(e)
    }

    // Initialize character count and height
    useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) {
        const initialValue = value || textarea.value || ''
        setCharacterCount(initialValue.toString().length)
        
        if (autoResize) {
          adjustHeight(textarea)
        }
      }
    }, [value, autoResize])

    // Character count indicators
    const getCharacterCountColor = () => {
      if (!maxLength) return 'text-muted-foreground'
      
      const percentage = characterCount / maxLength
      if (percentage >= 1) return 'text-destructive'
      if (percentage >= 0.9) return 'text-yellow-600'
      return 'text-muted-foreground'
    }

    const getCharacterCountMessage = () => {
      if (maxLength && characterCount > maxLength) {
        return t('characterMaximum', {
          count: maxLength
        })
      }

      if (minLength && characterCount < minLength) {
        return t('characterMinimum', {
          count: minLength
        })
      }

      return null
    }

    if (variant === 'floating') {
      return (
        <FloatingTextarea
          ref={ref}
          textareaRef={textareaRef}
          inputId={inputId}
          label={label}
          error={error}
          hint={hint}
          success={success}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          showCharacterCount={showCharacterCount}
          characterCount={characterCount}
          isFocused={isFocused}
          hasError={hasError}
          hasSuccess={hasSuccess}
          getCharacterCountColor={getCharacterCountColor}
          getCharacterCountMessage={getCharacterCountMessage}
          handleChange={handleChange}
          handleFocus={handleFocus}
          handleBlur={handleBlur}
          className={className}
          value={value}
          {...props}
        />
      )
    }

    return (
      <div className={cn("space-y-2", className)}>
        {/* Label */}
        <Label 
          htmlFor={inputId}
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

        {/* Textarea Container */}
        <div className="relative">
          <Textarea
            ref={(node) => {
              textareaRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            id={inputId}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "transition-all duration-200 resize-none",
              hasError && "border-destructive focus-visible:ring-destructive",
              hasSuccess && "border-green-500 focus-visible:ring-green-500",
              isFocused && "ring-2",
              autoResize && "overflow-hidden"
            )}
            style={{
              minHeight: autoResize ? '80px' : undefined
            }}
            aria-invalid={hasError}
            aria-describedby={cn(
              error && `${inputId}-error`,
              hint && `${inputId}-hint`,
              success && `${inputId}-success`,
              showCharacterCount && `${inputId}-count`
            )}
            {...props}
          />

          {/* Status Icons */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 space-y-1">
            {/* Error Message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                id={`${inputId}-error`}
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            {/* Success Message */}
            {success && !error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                id={`${inputId}-success`}
                className="text-sm text-green-600"
              >
                {success}
              </motion.p>
            )}

            {/* Character Count Message */}
            {getCharacterCountMessage() && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "text-sm",
                  maxLength && characterCount > maxLength ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {getCharacterCountMessage()}
              </motion.p>
            )}

            {/* Hint */}
            {hint && !error && !success && !getCharacterCountMessage() && (
              <p
                id={`${inputId}-hint`}
                className="text-sm text-muted-foreground"
              >
                {hint}
              </p>
            )}
          </div>

          {/* Character Count */}
          {showCharacterCount && (maxLength || minLength) && (
            <div 
              id={`${inputId}-count`}
              className={cn(
                "text-xs tabular-nums font-mono",
                getCharacterCountColor()
              )}
            >
              {maxLength ? `${characterCount}/${maxLength}` : characterCount}
              {minLength && characterCount < minLength && (
                <span className="text-muted-foreground ml-1">
                  (min: {minLength})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

TextareaInput.displayName = 'TextareaInput'

// Floating Label Variant
const FloatingTextarea = forwardRef<HTMLTextAreaElement, any>(
  ({
    textareaRef,
    inputId,
    label,
    error,
    hint,
    success,
    required,
    maxLength,
    minLength,
    showCharacterCount,
    characterCount,
    isFocused,
    hasError,
    hasSuccess,
    getCharacterCountColor,
    getCharacterCountMessage,
    handleChange,
    handleFocus,
    handleBlur,
    className,
    value,
    ...props
  }, ref) => {
    const { t } = useFormTranslation()
    const hasValue = value || props.defaultValue
    const labelFloated = isFocused || hasValue

    return (
      <div className={cn("space-y-2", className)}>
        {/* Textarea Container */}
        <div className="relative">
          {/* Floating Label */}
          <Label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none z-10",
              labelFloated
                ? "top-3 text-xs text-muted-foreground"
                : "top-4 text-base text-muted-foreground",
              hasError && labelFloated && "text-destructive",
              hasSuccess && labelFloated && "text-green-600",
              isFocused && "text-primary"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          
          <Textarea
            ref={(node) => {
              textareaRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            id={inputId}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className={cn(
              "pt-7 pb-4 transition-all duration-200 resize-none",
              hasError && "border-destructive focus-visible:ring-destructive",
              hasSuccess && "border-green-500 focus-visible:ring-green-500"
            )}
            style={{ minHeight: '100px' }}
            aria-invalid={hasError}
            {...props}
          />

          {/* Status Icons */}
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 space-y-1">
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-destructive"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            {success && !error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-green-600"
              >
                {success}
              </motion.p>
            )}

            {getCharacterCountMessage() && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-sm text-muted-foreground"
              >
                {getCharacterCountMessage()}
              </motion.p>
            )}

            {hint && !error && !success && !getCharacterCountMessage() && (
              <p className="text-sm text-muted-foreground">
                {hint}
              </p>
            )}
          </div>

          {showCharacterCount && (maxLength || minLength) && (
            <div className={cn(
              "text-xs tabular-nums font-mono",
              getCharacterCountColor()
            )}>
              {maxLength ? `${characterCount}/${maxLength}` : characterCount}
              {minLength && characterCount < minLength && (
                <span className="text-muted-foreground ml-1">
                  (min: {minLength})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

FloatingTextarea.displayName = 'FloatingTextarea'