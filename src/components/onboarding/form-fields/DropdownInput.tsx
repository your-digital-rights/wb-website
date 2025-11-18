'use client'

import { forwardRef, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
  Check
} from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DropdownOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface DropdownInputProps {
  label: string
  options: DropdownOption[]
  value?: string | string[]
  defaultValue?: string | string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  maxSelections?: number
  variant?: 'default' | 'floating'
  className?: string
  name?: string
  onValueChange?: (value: string | string[]) => void
  onSearch?: (search: string) => void
}

export const DropdownInput = forwardRef<HTMLButtonElement, DropdownInputProps>(
  ({
    label,
    options,
    value,
    defaultValue,
    placeholder,
    searchPlaceholder,
    emptyText,
    error,
    hint,
    success,
    required = false,
    multiple = false,
    searchable = true,
    clearable = true,
    disabled = false,
    maxSelections,
    variant = 'default',
    className,
    name,
    onValueChange,
    onSearch,
  }, ref) => {
    const t = useTranslations('forms.dropdown')
    const [open, setOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    
    const inputId = `dropdown-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error
    const hasSuccess = !!success && !hasError
    
    // Normalize value to always work with arrays internally
    const selectedValues = useMemo(() => {
      if (value === undefined && defaultValue === undefined) return []
      const currentValue = value !== undefined ? value : defaultValue
      return multiple 
        ? Array.isArray(currentValue) ? currentValue : [currentValue].filter(Boolean)
        : Array.isArray(currentValue) ? currentValue : [currentValue].filter(Boolean)
    }, [value, defaultValue, multiple])

    // Filter options based on search
    const filteredOptions = useMemo(() => {
      if (!searchQuery) return options
      
      const query = searchQuery.toLowerCase()
      return options.filter(option => 
        option.label.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query)
      )
    }, [options, searchQuery])

    // Get selected option labels for display
    const selectedLabels = useMemo(() => {
      return selectedValues.map(val => 
        options.find(opt => opt.value === val)?.label || val
      ).filter(Boolean)
    }, [selectedValues, options])

    const handleSelect = (optionValue: string) => {
      let newValues: string[]
      
      if (multiple) {
        if (selectedValues.includes(optionValue)) {
          // Remove from selection
          newValues = selectedValues.filter(v => v !== optionValue && v !== undefined) as string[]
        } else {
          // Add to selection (check max limit)
          if (maxSelections && selectedValues.length >= maxSelections) {
            return // Don't add if at max limit
          }
          newValues = [...selectedValues.filter(v => v !== undefined) as string[], optionValue]
        }
      } else {
        newValues = [optionValue]
        setOpen(false) // Close dropdown for single select
      }

      const returnValue = multiple ? newValues : newValues[0] || ''
      onValueChange?.(returnValue)
    }

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation()
      onValueChange?.(multiple ? [] : '')
    }

    const handleRemoveTag = (valueToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (multiple) {
        const newValues = selectedValues.filter(v => v !== valueToRemove && v !== undefined) as string[]
        onValueChange?.(newValues)
      }
    }

    const handleSearchChange = (search: string) => {
      setSearchQuery(search)
      onSearch?.(search)
    }

    const displayValue = () => {
      if (selectedValues.length === 0) {
        return placeholder || t('placeholder')
      }
      
      if (multiple) {
        return '' // Tags will be shown separately
      }
      
      return selectedLabels[0] || ''
    }

    const canClear = clearable && selectedValues.length > 0 && !disabled

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

        {/* Dropdown */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              id={inputId}
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal h-auto min-h-[40px] px-3 py-2",
                hasError && "border-destructive focus-visible:ring-destructive",
                hasSuccess && "border-green-500 focus-visible:ring-green-500",
                !selectedValues.length && "text-muted-foreground"
              )}
            >
              <div className="flex flex-wrap items-center gap-1 flex-1 min-h-[24px]">
                {multiple && selectedValues.length > 0 ? (
                  // Multiple selection - show as tags
                  selectedLabels.map((label, index) => (
                    <Badge
                      key={selectedValues[index]}
                      variant="secondary"
                      className="text-xs h-6 flex items-center gap-1"
                    >
                      {label}
                      <span
                        role="button"
                        tabIndex={0}
                        className="inline-flex h-4 w-4 items-center justify-center hover:bg-accent/20 rounded cursor-pointer"
                        onClick={(e) => handleRemoveTag(selectedValues[index] || '', e)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleRemoveTag(selectedValues[index] || '', e as any)
                          }
                        }}
                        aria-label={`Remove ${label}`}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </Badge>
                  ))
                ) : (
                  // Single selection or empty
                  <span className={cn(
                    "truncate",
                    selectedValues.length === 0 && "text-muted-foreground"
                  )}>
                    {displayValue()}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                {/* Status Icons */}
                {hasError && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                {hasSuccess && (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                )}
                
                {/* Clear Button */}
                {canClear && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex h-4 w-4 items-center justify-center hover:bg-accent/20 rounded cursor-pointer"
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleClear(e as any)
                      }
                    }}
                    aria-label="Clear selection"
                  >
                    <X className="h-3 w-3" />
                  </span>
                )}
                
                {/* Chevron */}
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180"
                )} />
              </div>
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-full p-1" align="start">
            <Command>
              {searchable && (
                <CommandInput
                  placeholder={searchPlaceholder || t('search')}
                  value={searchQuery}
                  onValueChange={handleSearchChange}
                  className="h-9"
                />
              )}

              <CommandEmpty>
                {emptyText || t('noResults')}
              </CommandEmpty>

              <CommandGroup className="max-h-64 overflow-auto">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    onSelect={() => handleSelect(option.value)}
                    className="flex items-center gap-2"
                  >
                    {/* Selection Indicator */}
                    <div className={cn(
                      "flex h-4 w-4 items-center justify-center flex-shrink-0",
                      selectedValues.includes(option.value)
                        ? "text-primary"
                        : "text-transparent"
                    )}>
                      <Check className="h-4 w-4" />
                    </div>

                    {/* Option Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>

            {/* Selection Counter */}
            {multiple && maxSelections && (
              <div className="border-t px-3 py-2 text-xs text-muted-foreground">
                {t('selectedCount', {
                  count: selectedValues.length,
                  max: maxSelections
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Messages */}
        <div className="space-y-1">
          {/* Error Message */}
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

          {/* Success Message */}
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

          {/* Hint */}
          {hint && !error && !success && (
            <p className="text-sm text-muted-foreground">
              {hint}
            </p>
          )}
        </div>

        {/* Hidden input for React Hook Form */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={multiple ? selectedValues.join(',') : selectedValues[0] || ''}
          />
        )}
      </div>
    )
  }
)

DropdownInput.displayName = 'DropdownInput'