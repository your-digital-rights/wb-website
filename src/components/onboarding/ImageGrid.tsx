'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Check, AlertCircle, CheckCircle2, Loader2, Eye } from 'lucide-react'
import Image from 'next/image'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { LiveRegion } from './AccessibilityAnnouncer'

interface ImageOption {
  id: string
  title: string
  description?: string
  imageUrl: string
  category?: string
  tags?: string[]
  premium?: boolean
}

interface ImageGridProps {
  label: string
  options: ImageOption[]
  value?: string | string[]
  defaultValue?: string | string[]
  placeholder?: string
  error?: string
  hint?: string
  success?: string
  required?: boolean
  multiple?: boolean
  maxSelections?: number
  columns?: 2 | 3 | 4 | 6
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape'
  showTitles?: boolean
  showDescriptions?: boolean
  showCategories?: boolean
  className?: string
  onSelectionChange?: (selected: string | string[]) => void
}

export function ImageGrid({
  label,
  options,
  value,
  defaultValue,
  placeholder,
  error,
  hint,
  success,
  required = false,
  multiple = false,
  maxSelections,
  columns = 3,
  aspectRatio = 'square',
  showTitles = true,
  showDescriptions = false,
  showCategories = false,
  className,
  onSelectionChange
}: ImageGridProps) {
  const t = useTranslations('forms.imageGrid')
  
  // Normalize selection to always work with arrays internally
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (value !== undefined) {
      return Array.isArray(value) ? value : [value]
    }
    if (defaultValue !== undefined) {
      return Array.isArray(defaultValue) ? defaultValue : [defaultValue]
    }
    return []
  })

  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [previewImage, setPreviewImage] = useState<ImageOption | null>(null)
  const [announcement, setAnnouncement] = useState('')

  // Refs for keyboard navigation
  const gridRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  // Track last selection to prevent duplicate announcements from keyboard+click
  const lastSelectionRef = useRef<{ id: string; timestamp: number } | null>(null)

  // Clear optionRefs when options change to prevent memory leaks
  useEffect(() => {
    optionRefs.current.clear()
  }, [options])

  const hasError = !!error
  const hasSuccess = !!success && !hasError

  // Helper functions (defined before useCallback hooks that use them)
  const isSelected = useCallback((optionId: string) => selectedIds.includes(optionId), [selectedIds])
  const canSelectMore = !multiple || !maxSelections || selectedIds.length < maxSelections

  // Update selected IDs when external value changes
  useEffect(() => {
    if (value !== undefined) {
      const newSelected = Array.isArray(value) ? value : [value]
      setSelectedIds(newSelected)
    }
  }, [value])

  // Handle selection
  const handleSelection = useCallback((optionId: string) => {
    let newSelected: string[]

    if (multiple) {
      if (selectedIds.includes(optionId)) {
        // Remove from selection
        newSelected = selectedIds.filter(id => id !== optionId)
      } else {
        // Add to selection (check max limit)
        if (maxSelections && selectedIds.length >= maxSelections) {
          // Replace oldest selection if at max
          newSelected = [...selectedIds.slice(1), optionId]
        } else {
          newSelected = [...selectedIds, optionId]
        }
      }
    } else {
      // Single selection
      newSelected = selectedIds.includes(optionId) ? [] : [optionId]
    }

    setSelectedIds(newSelected)

    // Return appropriate format
    const returnValue = multiple ? newSelected : (newSelected[0] || '')
    onSelectionChange?.(returnValue)
  }, [multiple, maxSelections, selectedIds, onSelectionChange])

  // Announce selection changes to screen readers (with debounce to prevent duplicates)
  const announceSelection = useCallback((option: ImageOption, selected: boolean) => {
    const now = Date.now()
    const last = lastSelectionRef.current

    // Prevent duplicate announcement if same option was just handled (within 100ms)
    if (last && last.id === option.id && now - last.timestamp < 100) {
      return
    }

    lastSelectionRef.current = { id: option.id, timestamp: now }
    const action = selected ? 'selected' : 'deselected'
    setAnnouncement(`${option.title} ${action}`)
    // Clear after announcement
    setTimeout(() => setAnnouncement(''), 1000)
  }, [])

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent, optionId: string, optionIndex: number, flatOptions: ImageOption[]) => {
    const currentIndex = optionIndex
    let nextIndex: number | null = null

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        nextIndex = currentIndex < flatOptions.length - 1 ? currentIndex + 1 : 0
        break
      case 'ArrowLeft':
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : flatOptions.length - 1
        break
      case 'ArrowDown':
        e.preventDefault()
        nextIndex = currentIndex + columns < flatOptions.length ? currentIndex + columns : currentIndex
        break
      case 'ArrowUp':
        e.preventDefault()
        nextIndex = currentIndex - columns >= 0 ? currentIndex - columns : currentIndex
        break
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
      case 'End':
        e.preventDefault()
        nextIndex = flatOptions.length - 1
        break
      case ' ':
      case 'Enter':
        e.preventDefault()
        // Capture selection state BEFORE handleSelection to avoid stale closure
        const wasSelected = isSelected(optionId)
        const canSelect = canSelectMore || wasSelected
        if (canSelect) {
          handleSelection(optionId)
          const option = flatOptions.find(o => o.id === optionId)
          if (option) {
            // Use captured state, not isSelected (which would return stale value)
            announceSelection(option, !wasSelected)
          }
        }
        return
    }

    if (nextIndex !== null && nextIndex !== currentIndex) {
      const nextOption = flatOptions[nextIndex]
      const nextRef = optionRefs.current.get(nextOption.id)
      nextRef?.focus()
    }
  }, [columns, announceSelection, canSelectMore, isSelected, handleSelection])

  // Handle image loading states
  const handleImageLoadStart = (imageId: string) => {
    setLoadingImages(prev => new Set([...prev, imageId]))
  }

  const handleImageLoadComplete = (imageId: string) => {
    setLoadingImages(prev => {
      const updated = new Set(prev)
      updated.delete(imageId)
      return updated
    })
  }

  const handleImageLoadError = (imageId: string) => {
    setLoadingImages(prev => {
      const updated = new Set(prev)
      updated.delete(imageId)
      return updated
    })
    setFailedImages(prev => new Set([...prev, imageId]))
  }

  // Get grid columns class
  const getGridColumns = () => {
    const colMap = {
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-4',
      6: 'grid-cols-3 md:grid-cols-6'
    }
    return colMap[columns]
  }

  // Get aspect ratio class
  const getAspectRatio = () => {
    const ratioMap = {
      square: 'aspect-square',
      video: 'aspect-video',
      portrait: 'aspect-[3/4]',
      landscape: 'aspect-[4/3]'
    }
    return ratioMap[aspectRatio]
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
      }, {} as Record<string, ImageOption[]>)
    : { [t('all')]: options }

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

        {/* Selection Counter */}
        {multiple && maxSelections && (
          <div className="text-xs text-muted-foreground">
            {t('selectedCount', { 
              count: selectedIds.length, 
              max: maxSelections 
            })}
          </div>
        )}
      </div>

      {/* Screen reader announcement for selection changes */}
      <LiveRegion message={announcement} priority="polite" />

      {/* Image Grid */}
      <div className="space-y-6">
        {Object.entries(groupedOptions).map(([category, categoryOptions]) => {
          // Get flat list of all options for keyboard navigation
          const flatOptions = options

          return (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              {showCategories && Object.keys(groupedOptions).length > 1 && (
                <h4 className="text-sm font-medium text-muted-foreground">
                  {category}
                </h4>
              )}

              {/* Grid */}
              <div
                ref={gridRef}
                className={cn(
                  "grid gap-3",
                  getGridColumns()
                )}
                role={multiple ? "group" : "radiogroup"}
                aria-label={label}
              >
                {categoryOptions.map((option, index) => {
                  const selected = isSelected(option.id)
                  const loading = loadingImages.has(option.id)
                  const failed = failedImages.has(option.id)
                  const canSelect = canSelectMore || selected
                  const flatIndex = flatOptions.findIndex(o => o.id === option.id)

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: index * 0.05,
                        duration: 0.2
                      }}
                    >
                      <button
                        ref={(el) => {
                          if (el) optionRefs.current.set(option.id, el)
                          else optionRefs.current.delete(option.id)
                        }}
                        type="button"
                        role={multiple ? "checkbox" : "radio"}
                        aria-checked={selected}
                        aria-label={`${option.title}${option.description ? `, ${option.description}` : ''}${selected ? ', selected' : ''}`}
                        aria-disabled={!canSelect && !selected}
                        tabIndex={flatIndex === 0 || selected ? 0 : -1}
                        onClick={() => {
                          if (canSelect) {
                            handleSelection(option.id)
                            announceSelection(option, !selected)
                          }
                        }}
                        onKeyDown={(e) => handleKeyDown(e, option.id, flatIndex, flatOptions)}
                        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
                      >
                        <Card
                          className={cn(
                            "group transition-all duration-200",
                            "hover:shadow-lg hover:scale-[1.02]",
                            selected && "ring-2 ring-primary shadow-lg",
                            !canSelect && !selected && "opacity-50"
                          )}
                        >
                      <CardContent className="p-0">
                        {/* Image Container */}
                        <div className={cn(
                          "relative overflow-hidden rounded-t-lg",
                          getAspectRatio()
                        )}>
                          {/* Loading State */}
                          {loading && (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                          )}

                          {/* Failed State */}
                          {failed && (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                              <div className="text-center space-y-1">
                                <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto" />
                                <p className="text-xs text-muted-foreground">
                                  {t('imageLoadError')}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Image */}
                          {!failed && (
                            <Image
                              src={option.imageUrl}
                              alt={option.title}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              onLoadStart={() => handleImageLoadStart(option.id)}
                              onLoad={() => handleImageLoadComplete(option.id)}
                              onError={() => handleImageLoadError(option.id)}
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                            />
                          )}

                          {/* Overlay */}
                          <div className={cn(
                            "absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all",
                            selected && "bg-black/20"
                          )}>
                            {/* Selection Indicator */}
                            <div className={cn(
                              "absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white",
                              "flex items-center justify-center transition-all",
                              selected ? "bg-primary" : "bg-white/20"
                            )}>
                              {selected && <Check className="w-3 h-3 text-white" />}
                            </div>

                            {/* Preview Button */}
                            <div className={cn(
                              "absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            )}>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setPreviewImage(option)
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh]">
                                  <DialogTitle className="sr-only">
                                    {option.title} - {t('preview')}
                                  </DialogTitle>
                                  <div className="space-y-4">
                                    <div className="relative rounded-lg overflow-hidden">
                                      <Image
                                        src={option.imageUrl}
                                        alt={option.title}
                                        width={800}
                                        height={600}
                                        className="object-contain w-full h-auto max-h-[60vh]"
                                        sizes="(max-width: 768px) 100vw, 80vw"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <h3 className="text-lg font-semibold">{option.title}</h3>
                                      {option.description && (
                                        <p className="text-muted-foreground">{option.description}</p>
                                      )}
                                      {option.tags && (
                                        <div className="flex flex-wrap gap-1">
                                          {option.tags.map((tag) => (
                                            <Badge key={tag} variant="outline" className="text-xs">
                                              {tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>

                            {/* Premium Badge */}
                            {option.premium && (
                              <div className="absolute top-2 left-2">
                                <Badge className="text-xs bg-yellow-500 text-yellow-50">
                                  {t('premium')}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        {(showTitles || showDescriptions) && (
                          <div className="p-3 space-y-1">
                            {showTitles && (
                              <h4 className="text-sm font-medium line-clamp-1">
                                {option.title}
                              </h4>
                            )}
                            {showDescriptions && option.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {option.description}
                              </p>
                            )}
                            {option.tags && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {option.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {option.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{option.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                        </Card>
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* No Selection State */}
      {options.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">{placeholder || t('noOptions')}</p>
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