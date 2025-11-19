'use client'

import { forwardRef, useState, useId } from 'react'
import { useFormTranslation } from '@/hooks/useTranslationWithFallback'
import { motion } from 'framer-motion'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  showPasswordToggle?: boolean
  characterCount?: number
  maxLength?: number
  variant?: 'default' | 'floating'
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({
    label,
    error,
    hint,
    success,
    required = false,
    showPasswordToggle = false,
    characterCount,
    maxLength,
    variant = 'default',
    leftIcon,
    rightIcon,
    className,
    type: propType = 'text',
    ...props
  }, ref) => {
    const { t } = useFormTranslation()
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const generatedId = useId()

    const inputType = showPasswordToggle
      ? (showPassword ? 'text' : 'password')
      : propType

    const hasError = !!error
    const hasSuccess = !!success && !hasError
    const showCharacterCount = typeof characterCount === 'number' && maxLength

    const inputId = props.id || `input-${generatedId}`

    if (variant === 'floating') {
      return (
        <FloatingLabelInput
          ref={ref}
          label={label}
          error={error}
          hint={hint}
          success={success}
          required={required}
          showPasswordToggle={showPasswordToggle}
          characterCount={characterCount}
          maxLength={maxLength}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          className={className}
          type={inputType}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          inputId={inputId}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
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

        {/* Input Container */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          
          <Input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              "transition-all duration-200",
              leftIcon && "pl-10",
              (showPasswordToggle || rightIcon) && "pr-10",
              hasError && "border-destructive focus-visible:ring-destructive",
              hasSuccess && "border-green-500 focus-visible:ring-green-500",
              isFocused && "ring-2"
            )}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            aria-invalid={hasError}
            aria-describedby={cn(
              error && `${inputId}-error`,
              hint && `${inputId}-hint`,
              success && `${inputId}-success`
            )}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            {showPasswordToggle && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            )}
            {rightIcon && !hasError && !hasSuccess && !showPasswordToggle && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
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

            {/* Hint */}
            {hint && !error && !success && (
              <p
                id={`${inputId}-hint`}
                className="text-sm text-muted-foreground"
              >
                {hint}
              </p>
            )}
          </div>

          {/* Character Count */}
          {showCharacterCount && (
            <div className={cn(
              "text-xs tabular-nums",
              characterCount > maxLength * 0.9 
                ? "text-destructive" 
                : "text-muted-foreground"
            )}>
              {characterCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

// Floating Label Variant
const FloatingLabelInput = forwardRef<HTMLInputElement, any>(
  ({
    label,
    error,
    hint,
    success,
    required,
    showPasswordToggle,
    characterCount,
    maxLength,
    leftIcon,
    rightIcon,
    className,
    type,
    showPassword,
    setShowPassword,
    inputId,
    isFocused,
    setIsFocused,
    ...props
  }, ref) => {
    const { t } = useFormTranslation()
    const hasValue = props.value || props.defaultValue
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    const showCharacterCount = typeof characterCount === 'number' && maxLength
    
    const labelFloated = isFocused || hasValue

    return (
      <div className={cn("space-y-2", className)}>
        {/* Input Container */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground z-10">
              {leftIcon}
            </div>
          )}
          
          {/* Floating Label */}
          <Label
            htmlFor={inputId}
            className={cn(
              "absolute left-3 transition-all duration-200 pointer-events-none z-10",
              leftIcon && "left-10",
              labelFloated
                ? "top-2 text-xs text-muted-foreground"
                : "top-1/2 transform -translate-y-1/2 text-base text-muted-foreground",
              hasError && labelFloated && "text-destructive",
              hasSuccess && labelFloated && "text-green-600",
              isFocused && "text-accent"
            )}
          >
            {label}
            {required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          
          <Input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              "pt-6 pb-2 transition-all duration-200",
              leftIcon && "pl-10",
              (showPasswordToggle || rightIcon) && "pr-10",
              hasError && "border-destructive focus-visible:ring-destructive",
              hasSuccess && "border-green-500 focus-visible:ring-green-500"
            )}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            aria-invalid={hasError}
            {...props}
          />

          {/* Right Icons */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {hasError && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            {hasSuccess && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
            {showPasswordToggle && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            )}
            {rightIcon && !hasError && !hasSuccess && !showPasswordToggle && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
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

            {hint && !error && !success && (
              <p className="text-sm text-muted-foreground">
                {hint}
              </p>
            )}
          </div>

          {showCharacterCount && (
            <div className={cn(
              "text-xs tabular-nums",
              characterCount > maxLength * 0.9 
                ? "text-destructive" 
                : "text-muted-foreground"
            )}>
              {characterCount}/{maxLength}
            </div>
          )}
        </div>
      </div>
    )
  }
)

FloatingLabelInput.displayName = 'FloatingLabelInput'