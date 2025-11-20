/**
 * Product Photo Upload Component
 * Feature: 002-improved-products-service
 *
 * Handles photo upload and management for a single product
 * - Max 5 photos per product
 * - Drag-and-drop reordering
 * - Upload progress tracking
 * - File validation (JPEG/PNG/WebP, 10MB max)
 */

'use client'

import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, GripVertical, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { UploadedFile } from '@/types/onboarding'
import { validateProductPhotoFile } from '@/services/supabase/storage'
import { Button } from '@/components/ui/button'
import { useOnboardingStore } from '@/stores/onboarding'
import Image from 'next/image'

interface ProductPhotoUploadProps {
  productId: string
  photos: UploadedFile[]
  onPhotosChange: (photos: UploadedFile[]) => void
  onUploadStart?: () => void
  onUploadComplete?: () => void
  maxPhotos?: number
  disabled?: boolean
}

interface UploadProgress {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export function ProductPhotoUpload({
  productId,
  photos,
  onPhotosChange,
  onUploadStart,
  onUploadComplete,
  maxPhotos = 5,
  disabled = false
}: ProductPhotoUploadProps) {
  const { sessionId } = useOnboardingStore()
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([])
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const isUploading = uploadQueue.some(u => u.status === 'uploading')
  const canAddMore = photos.length + uploadQueue.length < maxPhotos

  // Handle file drop/selection
  const onDrop = async (acceptedFiles: File[]) => {
    if (disabled || !canAddMore) return

    // Validate files
    const validFiles: File[] = []
    for (const file of acceptedFiles) {
      const validation = validateProductPhotoFile(file)
      if (!validation.valid) {
        alert(validation.error)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    // Limit to remaining slots
    const remainingSlots = maxPhotos - photos.length - uploadQueue.length
    const filesToUpload = validFiles.slice(0, remainingSlots)

    // Create upload progress entries
    const newUploads: UploadProgress[] = filesToUpload.map(file => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'uploading' as const
    }))

    setUploadQueue(prev => [...prev, ...newUploads])
    onUploadStart?.()

    // Upload files
    for (const upload of newUploads) {
      await uploadPhoto(upload)
    }

    onUploadComplete?.()
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: maxPhotos - photos.length,
    disabled: disabled || !canAddMore,
    multiple: true
  })

  // Upload single photo to API
  const uploadPhoto = async (upload: UploadProgress) => {
    try {
      if (!sessionId) {
        throw new Error('No session ID')
      }

      const formData = new FormData()
      formData.append('file', upload.file)

      const response = await fetch(
        `/api/onboarding/sessions/${sessionId}/products/${productId}/photos`,
        {
          method: 'POST',
          body: formData
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const uploadedFile: UploadedFile = await response.json()

      // Update upload queue to completed
      setUploadQueue(prev =>
        prev.map(u =>
          u.id === upload.id
            ? { ...u, status: 'completed' as const, progress: 100 }
            : u
        )
      )

      // Add to photos list
      onPhotosChange([...photos, uploadedFile])

      // Remove from upload queue after short delay
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(u => u.id !== upload.id))
      }, 1000)
    } catch (error: any) {
      console.error('Photo upload failed:', error)
      setUploadQueue(prev =>
        prev.map(u =>
          u.id === upload.id
            ? { ...u, status: 'error' as const, error: error.message }
            : u
        )
      )
    }
  }

  // Handle photo deletion
  const handleDelete = async (photoId: string) => {
    if (disabled || isUploading) return

    try {
      if (!sessionId) return

      // Optimistically remove from UI
      const updatedPhotos = photos.filter(p => p.id !== photoId)
      onPhotosChange(updatedPhotos)

      // Delete from storage
      await fetch(
        `/api/onboarding/sessions/${sessionId}/products/${productId}/photos/${photoId}`,
        { method: 'DELETE' }
      )
    } catch (error) {
      console.error('Photo deletion failed:', error)
      // Restore photo on error
      alert('Failed to delete photo. Please try again.')
    }
  }

  // Drag-and-drop reordering
  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedItem(photoId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = photos.findIndex(p => p.id === draggedItem)
    const targetIndex = photos.findIndex(p => p.id === targetId)

    const reorderedPhotos = [...photos]
    const [moved] = reorderedPhotos.splice(draggedIndex, 1)
    reorderedPhotos.splice(targetIndex, 0, moved)

    onPhotosChange(reorderedPhotos)
    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      {(photos.length > 0 || uploadQueue.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Existing photos */}
          {photos.map((photo, index) => (
            <motion.div
              key={photo.id}
              layout
              className={cn(
                'relative group aspect-square rounded-lg overflow-hidden border-2',
                draggedItem === photo.id
                  ? 'opacity-50 border-blue-500'
                  : 'border-gray-200 dark:border-gray-700'
              )}
              draggable={!disabled && !isUploading}
              onDragStart={(e) => handleDragStart(e, photo.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, photo.id)}
              onDragEnd={handleDragEnd}
            >
              <Image
                src={photo.url}
                alt={photo.fileName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />

              {/* Drag handle */}
              {!disabled && !isUploading && (
                <div
                  className="absolute top-2 left-2 p-1 bg-black/50 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Drag to reorder"
                >
                  <GripVertical className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Delete button */}
              {!disabled && !isUploading && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete photo"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}

              {/* Photo index */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                {index + 1}
              </div>
            </motion.div>
          ))}

          {/* Uploading photos */}
          {uploadQueue.map((upload) => (
            <div
              key={upload.id}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-blue-500 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            >
              {upload.status === 'uploading' && (
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {upload.progress}%
                  </p>
                </div>
              )}

              {upload.status === 'error' && (
                <div className="text-center p-4">
                  <p className="text-sm text-red-600">{upload.error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => uploadPhoto(upload)}
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {upload.status === 'completed' && (
                <div className="text-center">
                  <p className="text-sm text-green-600">Uploaded!</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload dropzone */}
      {canAddMore && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
            (disabled || !canAddMore) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {isDragActive ? 'Drop photos here...' : 'Click or drag photos here'}
          </p>
          <p className="text-xs text-gray-500">
            JPEG, PNG, or WebP (max 10MB) • {photos.length}/{maxPhotos} photos
          </p>
        </div>
      )}

      {!canAddMore && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Maximum {maxPhotos} photos reached
        </p>
      )}
    </div>
  )
}
