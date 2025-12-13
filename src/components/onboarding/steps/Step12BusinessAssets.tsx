'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Controller } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Upload, Image as ImageIcon, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'

import { FileUploadWithProgress, FileUploadProgress } from '@/components/onboarding/FileUploadWithProgress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { StepComponentProps } from './index'
import { useOnboardingStore } from '@/stores/onboarding'
import { generateUUID } from '@/lib/utils'

/**
 * Error types for upload failures
 */
interface UploadError {
  type: 'network' | 'size' | 'type' | 'server' | 'session' | 'unknown'
  message: string
  fileName?: string
}

export function Step12BusinessAssets({ form, errors, isLoading }: StepComponentProps) {
  const t = useTranslations('onboarding.steps.12')
  const { control, watch, setValue } = form
  const sessionId = useOnboardingStore((state) => state.sessionId)

  const businessLogo = watch('logoUpload')
  const businessPhotos = watch('businessPhotos') || []

  // Track upload states for ephemeral uploading status only (not for display)
  const [logoUploadState, setLogoUploadState] = React.useState<FileUploadProgress[]>([])
  const [photosUploadState, setPhotosUploadState] = React.useState<FileUploadProgress[]>([])

  // Track upload errors (NEW: explicit error state)
  const [logoUploadError, setLogoUploadError] = React.useState<UploadError | null>(null)
  const [photosUploadError, setPhotosUploadError] = React.useState<UploadError | null>(null)

  /**
   * Helper function to parse upload error and return user-friendly error object
   */
  const parseUploadError = React.useCallback((fileProgress: FileUploadProgress): UploadError => {
    const errorMessage = fileProgress.error || 'Unknown error occurred'
    const fileName = fileProgress.file.name

    // Detect error type based on error message
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return {
        type: 'network',
        message: 'Network connection lost. Please check your internet and try again.',
        fileName
      }
    }

    if (errorMessage.includes('size') || errorMessage.includes('too large') || errorMessage.includes('exceeds')) {
      return {
        type: 'size',
        message: 'File size exceeds the maximum allowed. Please choose a smaller file.',
        fileName
      }
    }

    if (errorMessage.includes('type') || errorMessage.includes('format') || errorMessage.includes('not supported')) {
      return {
        type: 'type',
        message: 'File type not supported. Please use PNG or JPG format.',
        fileName
      }
    }

    if (errorMessage.includes('500') || errorMessage.includes('server') || errorMessage.includes('internal')) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again in a moment.',
        fileName
      }
    }

    if (errorMessage.includes('session') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      return {
        type: 'session',
        message: 'Session expired. Please refresh the page and try again.',
        fileName
      }
    }

    return {
      type: 'unknown',
      message: `Upload failed: ${errorMessage}`,
      fileName
    }
  }, [])

  // Helper function to convert saved file metadata back to FileUploadProgress format
  const convertToFileUploadProgress = React.useCallback((savedFile: any): FileUploadProgress | null => {
    try {
      // Validate required fields
      if (!savedFile || typeof savedFile !== 'object') return null
      if (!savedFile.url || typeof savedFile.url !== 'string') return null
      if (!savedFile.fileName || typeof savedFile.fileName !== 'string') return null

      // Create a mock File object for display purposes with proper size
      const mockFile = new File([], savedFile.fileName, {
        type: savedFile.mimeType || 'application/octet-stream'
      })

      // Override the size property to show the actual file size
      if (savedFile.fileSize && typeof savedFile.fileSize === 'number') {
        Object.defineProperty(mockFile, 'size', {
          value: savedFile.fileSize,
          writable: false,
          configurable: true
        })
      }

      return {
        id: savedFile.id || generateUUID(),
        file: mockFile,
        progress: 100,
        status: 'completed',
        url: savedFile.url
        // Note: preview is intentionally omitted for restored files
        // The FileUploadWithProgress component will show a file icon instead
      }
    } catch (error) {
      console.error('Failed to convert saved file to progress:', error, savedFile)
      return null
    }
  }, [])

  /**
   * Component State Management Strategy (Option A - Derived State):
   *
   * SINGLE source of truth: Form state (businessLogo, businessPhotos)
   *
   * UI state is DERIVED using useMemo:
   * - logoDisplay: Derived from businessLogo (form state)
   * - photosDisplay: Derived from businessPhotos (form state)
   *
   * Benefits:
   * - No sync needed - always reflects current form state
   * - No timing issues with form.reset()
   * - Simpler architecture with single source of truth
   */

  // Derive logo display state from form state
  const logoDisplay = React.useMemo(() => {
    if (!businessLogo) return []
    const progress = convertToFileUploadProgress(businessLogo)
    return progress ? [progress] : []
  }, [businessLogo, convertToFileUploadProgress])

  // Derive photos display state from form state
  const photosDisplay = React.useMemo(() => {
    if (!businessPhotos || !Array.isArray(businessPhotos) || businessPhotos.length === 0) return []
    return businessPhotos
      .map(convertToFileUploadProgress)
      .filter((p): p is FileUploadProgress => p !== null)
  }, [businessPhotos, convertToFileUploadProgress])

  /**
   * Merge derived display state with ephemeral upload state
   * - During upload: Show uploading status from component state
   * - After navigation: Show persisted data from derived state
   */
  const mergedLogoState = React.useMemo(() => {
    // If actively uploading, show upload state
    const hasUploadingLogo = logoUploadState.some(f => f.status === 'uploading')
    if (hasUploadingLogo) return logoUploadState

    // Otherwise show persisted data from form
    return logoDisplay
  }, [logoUploadState, logoDisplay])

  const mergedPhotosState = React.useMemo(() => {
    // If actively uploading, show upload state
    const hasUploadingPhotos = photosUploadState.some(f => f.status === 'uploading')
    if (hasUploadingPhotos) return photosUploadState

    // Otherwise show persisted data from form
    return photosDisplay
  }, [photosUploadState, photosDisplay])

  // Check if any files are currently uploading
  const hasUploadingFiles = React.useMemo(() => {
    const logoUploading = logoUploadState.some(f => f.status === 'uploading')
    const photosUploading = photosUploadState.some(f => f.status === 'uploading')
    return logoUploading || photosUploading
  }, [logoUploadState, photosUploadState])

  // Update a hidden form field to track upload status
  React.useEffect(() => {
    setValue('_uploading' as any, hasUploadingFiles, { shouldValidate: false })
  }, [hasUploadingFiles, setValue])

  return (
    <div className="space-y-8">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{t('intro.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            {t('intro.description')}
          </p>
        </div>
      </motion.div>

      {/* Business Logo Upload */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('logo.title')}</h2>
              <Badge variant="outline" className="ml-auto">
                {t('logo.optional')}
              </Badge>
            </div>

            <div className="space-y-4">
              <Alert role="note" aria-labelledby="logo-guidelines">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm" id="logo-guidelines">
                  {t('logo.guidelines')}
                </AlertDescription>
              </Alert>

              <Controller
                name="logoUpload"
                control={control}
                render={({ field }) => (
                  <FileUploadWithProgress
                    label={t('logo.upload.label')}
                    description={t('logo.upload.hint')}
                    accept={['image/png', 'image/jpeg']}
                    maxFiles={1}
                    maxFileSize={2 * 1024 * 1024} // 2MB
                    sessionId={sessionId || undefined}
                    uploadType="logo"
                    existingFiles={mergedLogoState}
                    onFilesChange={(files: FileUploadProgress[]) => {
                      /**
                       * CRITICAL: Only update form on meaningful changes to prevent data loss
                       *
                       * Update form when:
                       * 1. New upload completes (has completedFile)
                       * 2. User explicitly removes all files (files.length === 0 AND had previous value)
                       *
                       * DO NOT update form when:
                       * - Files are still uploading (preserve existing form data)
                       * - Component is just re-rendering (no actual change)
                       */

                      // Track upload state for UI
                      setLogoUploadState(files)

                      // Check for errors in upload
                      const errorFile = files.find(f => f.status === 'error')
                      if (errorFile) {
                        const error = parseUploadError(errorFile)
                        setLogoUploadError(error)
                      } else {
                        // Clear error when upload succeeds or is retried
                        setLogoUploadError(null)
                      }

                      const completedFile = files.find(f => f.status === 'completed')

                      if (completedFile) {
                        const meta = completedFile.uploadedFileMeta
                        const resolvedFileName = meta?.fileName || completedFile.file.name
                        const resolvedFileSize = typeof meta?.fileSize === 'number'
                          ? meta.fileSize
                          : completedFile.file.size
                        const resolvedMimeType = meta?.mimeType || completedFile.file.type
                        const resolvedUrl = meta?.url || completedFile.url

                        if (!resolvedFileName || !resolvedUrl) {
                          console.warn('[Step12BusinessAssets] Missing logo upload metadata', {
                            meta,
                            fileId: completedFile.id
                          })
                          return
                        }

                        // New upload completed → save to form
                        const newValue = {
                          id: meta?.id || completedFile.id,
                          fileName: resolvedFileName,
                          fileSize: resolvedFileSize,
                          mimeType: resolvedMimeType,
                          url: resolvedUrl,
                          uploadedAt: new Date().toISOString()
                        }
                        field.onChange(newValue)
                        // Clear error on successful upload
                        setLogoUploadError(null)
                      }

                      /**
                       * NOTE: We don't clear the form when files.length === 0 because:
                       * 1. FileUploadWithProgress handles file removal by calling onFilesChange
                       * 2. During component re-initialization, files.length === 0 temporarily
                       * 3. This would cause data loss during navigation
                       *
                       * File removal is handled by FileUploadWithProgress's remove button,
                       * which updates the internal state and will call this handler.
                       */
                    }}
                    disabled={isLoading}
                  />
                )}
              />

              {/* Logo Upload Error Alert */}
              {logoUploadError && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">
                    {logoUploadError.type === 'network' && 'Network Error'}
                    {logoUploadError.type === 'size' && 'File Too Large'}
                    {logoUploadError.type === 'type' && 'Invalid File Type'}
                    {logoUploadError.type === 'server' && 'Server Error'}
                    {logoUploadError.type === 'session' && 'Session Expired'}
                    {logoUploadError.type === 'unknown' && 'Upload Failed'}
                  </AlertTitle>
                  <AlertDescription className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm">{logoUploadError.message}</p>
                      {logoUploadError.fileName && (
                        <p className="text-xs opacity-80">File: {logoUploadError.fileName}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setLogoUploadError(null)
                        setLogoUploadState([])
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Logo Requirements */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">{t('logo.requirements.title')}</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.format')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.size')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.resolution')}
                    </li>
                  </ul>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.background')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.colors')}
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                      {t('logo.requirements.quality')}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Business Photos Upload */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t('photos.title')}</h2>
              <Badge variant="outline" className="ml-auto">
                {t('photos.optional')}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm text-primary">{t('photos.benefits.title')}</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('photos.benefits.trust')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('photos.benefits.personal')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                    {t('photos.benefits.professional')}
                  </li>
                </ul>
              </div>

              <Controller
                name="businessPhotos"
                control={control}
                render={({ field }) => (
                  <FileUploadWithProgress
                    label={t('photos.upload.label')}
                    description={t('photos.upload.hint')}
                    accept={['image/png', 'image/jpeg']}
                    maxFiles={30}
                    maxFileSize={10 * 1024 * 1024} // 10MB per file
                    sessionId={sessionId || undefined}
                    existingFiles={mergedPhotosState}
                    onFilesChange={(files: FileUploadProgress[]) => {
                      /**
                       * CRITICAL: Only update form when there are actual changes
                       *
                       * This prevents unnecessary re-renders and ensures we only
                       * save to localStorage when the user has actually changed something.
                       */

                      // Track upload state for UI
                      setPhotosUploadState(files)

                      // Check for errors in uploads
                      const errorFile = files.find(f => f.status === 'error')
                      if (errorFile) {
                        const error = parseUploadError(errorFile)
                        setPhotosUploadError(error)
                      } else {
                        // Clear error when all uploads succeed or are retried
                        setPhotosUploadError(null)
                      }

                      // Extract completed files
                      const completedFiles = files
                        .filter(f => f.status === 'completed')
                        .map(f => {
                          const meta = f.uploadedFileMeta
                          const resolvedFileName = meta?.fileName || f.file.name
                          const resolvedFileSize = typeof meta?.fileSize === 'number'
                            ? meta.fileSize
                            : f.file.size
                          const resolvedMimeType = meta?.mimeType || f.file.type
                          const resolvedUrl = meta?.url || f.url

                          if (!resolvedFileName || !resolvedUrl) {
                            console.warn('[Step12BusinessAssets] Missing metadata for business photo upload', {
                              meta,
                              fileId: f.id
                            })
                            return null
                          }

                          return {
                            id: meta?.id || f.id,
                            fileName: resolvedFileName,
                            fileSize: resolvedFileSize,
                            mimeType: resolvedMimeType,
                            url: resolvedUrl,
                            uploadedAt: new Date().toISOString()
                          }
                        })
                        .filter((value): value is {
                          id: string
                          fileName: string
                          fileSize: number
                          mimeType: string
                          url: string
                          uploadedAt: string
                        } => value !== null)

                      // Check if there are actual changes before updating form
                      const currentFormValue = field.value || []
                      const hasChanges =
                        completedFiles.length !== currentFormValue.length ||
                        completedFiles.some((f, i) => (f as any).id !== (currentFormValue[i] as any)?.id)

                      if (hasChanges) {
                        field.onChange(completedFiles)
                        // Clear error on successful upload
                        if (completedFiles.length > 0) {
                          setPhotosUploadError(null)
                        }
                      }
                    }}
                    disabled={isLoading}
                  />
                )}
              />

              {/* Photos Upload Error Alert */}
              {photosUploadError && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">
                    {photosUploadError.type === 'network' && 'Network Error'}
                    {photosUploadError.type === 'size' && 'File Too Large'}
                    {photosUploadError.type === 'type' && 'Invalid File Type'}
                    {photosUploadError.type === 'server' && 'Server Error'}
                    {photosUploadError.type === 'session' && 'Session Expired'}
                    {photosUploadError.type === 'unknown' && 'Upload Failed'}
                  </AlertTitle>
                  <AlertDescription className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm">{photosUploadError.message}</p>
                      {photosUploadError.fileName && (
                        <p className="text-xs opacity-80">File: {photosUploadError.fileName}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        setPhotosUploadError(null)
                        // Remove only failed files, keep completed ones
                        setPhotosUploadState(prev => prev.filter(f => f.status !== 'error'))
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Photo Categories Guide */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-accent/5 border-accent/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-accent-foreground" />
              <h4 className="font-semibold text-foreground">{t('categories.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h5 className="font-medium text-foreground">{t('categories.exterior.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.exterior.storefront')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.exterior.signage')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.exterior.entrance')}
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h5 className="font-medium text-foreground">{t('categories.interior.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.interior.workspace')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.interior.products')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.interior.atmosphere')}
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-foreground">{t('categories.team.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.team.owner')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.team.staff')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.team.action')}
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h5 className="font-medium text-foreground">{t('categories.services.title')}</h5>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.services.process')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.services.results')}
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                    {t('categories.services.tools')}
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upload Summary */}
      {(businessLogo || businessPhotos.length > 0) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-foreground" />
                <h4 className="font-medium text-sm text-foreground">{t('summary.title')}</h4>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h6 className="font-medium text-muted-foreground">{t('summary.logo')}</h6>
                  <p className="text-xs text-muted-foreground">
                    {businessLogo ? t('summary.uploaded') : t('summary.none')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h6 className="font-medium text-muted-foreground">{t('summary.photos')}</h6>
                  <p className="text-xs text-muted-foreground">
                    {businessPhotos.length > 0 
                      ? t('summary.photoCount', { count: businessPhotos.length })
                      : t('summary.none')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quality Guidelines */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <Card className="bg-muted/20 border-muted">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
              <h4 className="font-semibold text-foreground">{t('quality.title')}</h4>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h5 className="font-medium text-foreground">{t('quality.lighting.title')}</h5>
                <p className="text-muted-foreground text-xs">{t('quality.lighting.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-foreground">{t('quality.composition.title')}</h5>
                <p className="text-muted-foreground text-xs">{t('quality.composition.description')}</p>
              </div>
              
              <div className="space-y-2">
                <h5 className="font-medium text-foreground">{t('quality.authenticity.title')}</h5>
                <p className="text-muted-foreground text-xs">{t('quality.authenticity.description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Helper Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center text-sm text-muted-foreground space-y-2"
      >
        <p>{t('tips.title')}</p>
        {/* Desktop: inline with bullet separators */}
        <div className="hidden sm:flex flex-wrap justify-center gap-4">
          <span>{t('tips.quality')}</span>
          <span>•</span>
          <span>{t('tips.authentic')}</span>
          <span>•</span>
          <span>{t('tips.variety')}</span>
        </div>
        {/* Mobile: vertical list with bullets on the left */}
        <ul className="sm:hidden space-y-1 text-left max-w-xs mx-auto">
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.quality')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.authentic')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5">•</span>
            <span>{t('tips.variety')}</span>
          </li>
        </ul>
      </motion.div>
    </div>
  )
}
