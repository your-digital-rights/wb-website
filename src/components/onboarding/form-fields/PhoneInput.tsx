'use client'

import { forwardRef, useState, useId } from 'react'
import { useTranslations } from 'next-intl'
import { Phone, AlertCircle, CheckCircle2, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  variant?: 'default' | 'floating'
  defaultCountry?: string
  onCountryChange?: (country: string) => void
  onValidationChange?: (isValid: boolean, fullNumber: string) => void
}

// Common countries with their calling codes and validation patterns
const countries = [
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    pattern: /^\d{9,10}$/, // Italian phone: 9-10 digits (mobile or landline)
    placeholder: 'XXX XXXXXXX',
    format: (num: string) => num.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    pattern: /^\d{10}$/, // US phone: 10 digits
    placeholder: '(XXX) XXX-XXXX',
    format: (num: string) => num.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    pattern: /^\d{9,11}$/, // UK phone: 9-11 digits (mobile or landline)
    placeholder: 'XXXX XXXXXX',
    format: (num: string) => num.replace(/(\d{4})(\d{6})/, '$1 $2')
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    pattern: /^\d{9}$/, // French phone: 9 digits (mobile or landline)
    placeholder: 'X XX XX XX XX',
    format: (num: string) => num.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    pattern: /^\d{10,11}$/, // German phone: 10-11 digits (mobile or landline)
    placeholder: 'XXX XXXXXXXX',
    format: (num: string) => num.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3')
  },
  {
    code: 'ES',
    name: 'Spain',
    dialCode: '+34',
    pattern: /^\d{9}$/, // Spanish phone: 9 digits (mobile or landline)
    placeholder: 'XXX XXX XXX',
    format: (num: string) => num.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    pattern: /^\d{9}$/, // Dutch phone: 9 digits (mobile or landline)
    placeholder: 'X XXXX XXXX',
    format: (num: string) => num.replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3')
  }
]

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({
    label,
    error,
    hint,
    success,
    required = false,
    variant = 'default',
    defaultCountry = 'IT',
    onCountryChange,
    onValidationChange,
    onBlur,
    onChange,
    value,
    className,
    ...props
  }, ref) => {
    const t = useTranslations('forms.phone')
    const [selectedCountry, setSelectedCountry] = useState(defaultCountry)
    const [phoneNumber, setPhoneNumber] = useState(value || '')
    const [internalError, setInternalError] = useState<string>('')
    const [internalSuccess, setInternalSuccess] = useState<string>('')
    const generatedId = useId()

    const currentCountryData = countries.find(c => c.code === selectedCountry) || countries[0]
    const inputId = props.id || `phone-input-${generatedId}`

    const validatePhone = (number: string, countryData: typeof currentCountryData): boolean => {
      if (!number) return false
      
      // Remove all non-digits for validation
      const cleanNumber = number.replace(/\D/g, '')
      return countryData.pattern.test(cleanNumber)
    }

    const formatPhone = (number: string, countryData: typeof currentCountryData): string => {
      const cleanNumber = number.replace(/\D/g, '')
      return countryData.format ? countryData.format(cleanNumber) : cleanNumber
    }

    const handleCountryChange = (countryCode: string) => {
      const newCountryData = countries.find(c => c.code === countryCode)
      if (newCountryData) {
        setSelectedCountry(countryCode)
        onCountryChange?.(countryCode)
        
        // Clear validation messages when country changes
        setInternalError('')
        setInternalSuccess('')
        
        // Revalidate existing number with new country
        if (phoneNumber) {
          const phoneStr = String(phoneNumber)
          const isValid = validatePhone(phoneStr, newCountryData)
          const fullNumber = `${newCountryData.dialCode}${phoneStr.replace(/\D/g, '')}`
          onValidationChange?.(isValid, fullNumber)
        }
      }
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Allow only digits, spaces, parentheses, and dashes
      const cleanValue = inputValue.replace(/[^\d\s()-]/g, '')
      
      setPhoneNumber(cleanValue)
      setInternalError('')
      setInternalSuccess('')
      
      // Create a modified event with the cleaned value
      const modifiedEvent = {
        ...e,
        target: {
          ...e.target,
          value: cleanValue
        }
      }
      
      onChange?.(modifiedEvent)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const number = e.target.value
      
      if (number) {
        const isValid = validatePhone(number, currentCountryData)
        const cleanNumber = number.replace(/\D/g, '')
        const fullNumber = `${currentCountryData.dialCode}${cleanNumber}`
        
        if (isValid) {
          const formattedNumber = formatPhone(number, currentCountryData)
          setPhoneNumber(formattedNumber)
          setInternalSuccess(t('valid'))
          onValidationChange?.(true, fullNumber)
        } else {
          setInternalError(t('invalid', { country: currentCountryData.name }))
          onValidationChange?.(false, fullNumber)
        }
      }
      
      onBlur?.(e)
    }

    const displayError = error || internalError
    const displaySuccess = success || (!displayError && internalSuccess)
    const hasError = !!displayError
    const hasSuccess = !!displaySuccess

    return (
      <div className={cn("space-y-2", className)}>
        {/* Label */}
        <Label
          htmlFor={inputId}
          className={cn(
            "text-sm font-medium",
            hasError && "text-destructive"
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
        <div className="flex gap-2">
          {/* Country Selector */}
          <Select
            value={selectedCountry}
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="w-[100px]">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-mono">{currentCountryData.dialCode}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">
                      {country.dialCode}
                    </span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Phone Input */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground font-mono">
              {currentCountryData.dialCode}
            </div>
            
            <Input
              ref={ref}
              id={inputId}
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              onBlur={handleBlur}
              placeholder={currentCountryData.placeholder}
              className={cn(
                "pl-16 pr-10",
                hasError && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={hasError}
              aria-describedby={cn(
                displayError && `${inputId}-error`,
                hint && `${inputId}-hint`,
                displaySuccess && `${inputId}-success`
              )}
              {...props}
            />

            {/* Status Icons */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {hasError && (
                <AlertCircle className="w-4 h-4 text-destructive" />
              )}
              {hasSuccess && (
                <CheckCircle2 className="w-4 h-4 text-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {displayError && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${inputId}-error`}
              className="text-sm text-destructive"
              role="alert"
            >
              {displayError}
            </motion.p>
          )}

          {displaySuccess && !displayError && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${inputId}-success`}
              className="text-sm text-foreground"
            >
              {displaySuccess}
            </motion.p>
          )}

          {hint && !displayError && !displaySuccess && (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id={`${inputId}-hint`}
              className="text-sm text-muted-foreground"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Format Example */}
        {!displayError && !displaySuccess && !hint && (
          <p className="text-xs text-muted-foreground">
            {t('example')}: {currentCountryData.dialCode} {currentCountryData.placeholder}
          </p>
        )}
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'