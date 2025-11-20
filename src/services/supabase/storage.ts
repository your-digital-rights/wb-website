/**
 * Supabase Storage Service
 * Feature: 002-improved-products-service
 *
 * Provides helper methods for managing product photos in Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'
import { UploadedFile } from '@/types/onboarding'

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STORAGE_BUCKET = 'onboarding-photos'

/**
 * Upload a product photo to Supabase Storage
 *
 * @param sessionId - Onboarding session ID
 * @param productId - Product UUID
 * @param file - File object to upload
 * @returns UploadedFile metadata
 */
export async function uploadProductPhoto(
  sessionId: string,
  productId: string,
  file: File
): Promise<UploadedFile> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported')
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB in bytes
  if (file.size > maxSize) {
    throw new Error('File size cannot exceed 10 MB')
  }

  // Generate unique photo ID and storage path
  const photoId = crypto.randomUUID()
  const fileExtension = file.name.split('.').pop() || 'jpg'
  const storagePath = `${sessionId}/products/${productId}/${photoId}.${fileExtension}`

  // Convert file to buffer
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      duplex: 'half',
      upsert: false // Prevent overwriting existing photos
    })

  if (error) {
    console.error('Supabase upload error:', error)
    throw new Error(`Failed to upload photo: ${error.message}`)
  }

  // Get public URL
  const { data: publicUrlData } = supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path)

  // Extract image dimensions (if possible)
  let width: number | undefined
  let height: number | undefined

  try {
    // Attempt to get dimensions from image file
    // Note: This is a simplified approach; in production, you might use
    // a library like 'sharp' or process this on the client side
    if (typeof Image !== 'undefined') {
      const img = new Image()
      img.src = publicUrlData.publicUrl
      await img.decode()
      width = img.naturalWidth
      height = img.naturalHeight
    }
  } catch (dimensionError) {
    // Dimensions extraction failed, continue without dimensions
    console.warn('Failed to extract image dimensions:', dimensionError)
  }

  // Return UploadedFile metadata
  const uploadedFile: UploadedFile = {
    id: photoId,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    url: publicUrlData.publicUrl,
    width,
    height,
    uploadedAt: new Date().toISOString()
  }

  return uploadedFile
}

/**
 * Delete a single product photo from Supabase Storage
 *
 * @param sessionId - Onboarding session ID
 * @param productId - Product UUID
 * @param photoId - Photo UUID
 */
export async function deleteProductPhoto(
  sessionId: string,
  productId: string,
  photoId: string
): Promise<void> {
  // Construct storage path pattern to find the photo
  // Note: We need to list files to find the exact file extension
  const pathPrefix = `${sessionId}/products/${productId}/${photoId}`

  // List files matching the pattern
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(`${sessionId}/products/${productId}`)

  if (listError) {
    console.error('Error listing files for deletion:', listError)
    throw new Error(`Failed to locate photo: ${listError.message}`)
  }

  // Find the file matching the photoId
  const photoFile = files?.find((file) => file.name.startsWith(photoId))

  if (!photoFile) {
    // Photo not found - might have been already deleted
    console.warn(`Photo ${photoId} not found in storage, skipping deletion`)
    return
  }

  // Delete the file
  const fullPath = `${sessionId}/products/${productId}/${photoFile.name}`
  const { error: deleteError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([fullPath])

  if (deleteError) {
    console.error('Error deleting photo from storage:', deleteError)
    throw new Error(`Failed to delete photo: ${deleteError.message}`)
  }
}

/**
 * Bulk delete all photos for a product from Supabase Storage
 *
 * @param sessionId - Onboarding session ID
 * @param productId - Product UUID
 */
export async function deleteProductPhotos(
  sessionId: string,
  productId: string
): Promise<void> {
  // List all files in the product's photo directory
  const productPath = `${sessionId}/products/${productId}`

  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .list(productPath)

  if (listError) {
    console.error('Error listing product photos for deletion:', listError)
    throw new Error(`Failed to list product photos: ${listError.message}`)
  }

  if (!files || files.length === 0) {
    // No photos to delete
    return
  }

  // Construct full paths for all photos
  const filePaths = files.map((file) => `${productPath}/${file.name}`)

  // Delete all photos in bulk
  const { error: deleteError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove(filePaths)

  if (deleteError) {
    console.error('Error bulk deleting product photos:', deleteError)
    throw new Error(`Failed to delete product photos: ${deleteError.message}`)
  }
}

/**
 * Helper: Validate product photo file before upload
 * Can be used on client-side or server-side
 */
export function validateProductPhotoFile(file: File): {
  valid: boolean
  error?: string
} {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are supported'
    }
  }

  // Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size cannot exceed 10 MB'
    }
  }

  // Check file name length
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'File name is too long (max 255 characters)'
    }
  }

  return { valid: true }
}
