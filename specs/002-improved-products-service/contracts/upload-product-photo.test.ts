/**
 * Contract Test: Upload Product Photo
 *
 * Tests the API contract for uploading product photos to Supabase Storage.
 * This test ensures multipart/form-data handling and response schema consistency.
 *
 * Endpoint: POST /api/onboarding/sessions/{sessionId}/products/{productId}/photos
 * Purpose: Upload photo file and return storage URL
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

interface UploadPhotoResponse {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  width?: number
  height?: number
  uploadedAt: string
}

describe('Contract: Upload Product Photo', () => {
  let testSessionId: string
  let testProductId: string
  let apiBaseUrl: string
  let testImagePath: string

  beforeAll(() => {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3783'
    testSessionId = 'test-session-' + Date.now()
    testProductId = '550e8400-e29b-41d4-a716-446655440000'

    // Test image path (create small test JPEG for tests)
    testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
  })

  it('should upload valid JPEG file and return photo metadata', async () => {
    // Arrange: Create FormData with JPEG file
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo.jpg')

    // Act: Upload photo
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Response contract
    expect(response.status).toBe(200)

    const data: UploadPhotoResponse = await response.json()

    expect(data).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i), // UUID v4
      fileName: expect.stringContaining('.jpg'),
      fileSize: expect.any(Number),
      mimeType: 'image/jpeg',
      url: expect.stringMatching(/^https:\/\/.+\.supabase\.co\/storage\/v1\/object\/public\/onboarding-photos\/.+/),
      uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/) // ISO 8601
    })

    // Verify URL structure includes session ID and product ID
    expect(data.url).toContain(testSessionId)
    expect(data.url).toContain('products')
    expect(data.url).toContain(testProductId)
  })

  it('should upload valid PNG file and return photo metadata', async () => {
    // Arrange: Create FormData with PNG file
    const formData = new FormData()
    // For test purposes, use same image but claim PNG MIME type
    // In real tests, use actual PNG file
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    formData.append('file', imageBlob, 'test-photo.png')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert
    expect(response.status).toBe(200)
    const data: UploadPhotoResponse = await response.json()
    expect(data.mimeType).toBe('image/png')
    expect(data.fileName).toContain('.png')
  })

  it('should upload valid WebP file and return photo metadata', async () => {
    // Arrange: Create FormData with WebP file
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/webp' })
    formData.append('file', imageBlob, 'test-photo.webp')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert
    expect(response.status).toBe(200)
    const data: UploadPhotoResponse = await response.json()
    expect(data.mimeType).toBe('image/webp')
    expect(data.fileName).toContain('.webp')
  })

  it('should reject GIF file (unsupported format)', async () => {
    // Arrange: GIF file (invalid)
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/gif' })
    formData.append('file', imageBlob, 'test-photo.gif')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Should reject with 400 Bad Request
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/only jpeg, png, and webp/i)
  })

  it('should reject file larger than 10 MB', async () => {
    // Arrange: Create large file (10 MB + 1 byte)
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1)
    const formData = new FormData()
    const largeBlob = new Blob([largeBuffer], { type: 'image/jpeg' })
    formData.append('file', largeBlob, 'large-photo.jpg')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Should reject with 413 Payload Too Large
    expect([400, 413]).toContain(response.status)
    const data = await response.json()
    expect(data.error).toMatch(/file size.*10 mb/i)
  })

  it('should reject upload with missing file', async () => {
    // Arrange: FormData without file
    const formData = new FormData()

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Should reject with 400 Bad Request
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/file is required/i)
  })

  it('should reject upload for non-existent session', async () => {
    // Arrange: Invalid session ID
    const invalidSessionId = 'non-existent-session'
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo.jpg')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${invalidSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Should return 404 Not Found
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toMatch(/session not found/i)
  })

  it('should reject upload for non-existent product', async () => {
    // Arrange: Invalid product ID
    const invalidProductId = 'non-existent-product'
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo.jpg')

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${invalidProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    // Assert: Should return 404 Not Found
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toMatch(/product not found/i)
  })

  it('should generate unique photo IDs for multiple uploads', async () => {
    // Arrange: Upload 3 photos in sequence
    const photoIds: string[] = []

    for (let i = 0; i < 3; i++) {
      const formData = new FormData()
      const imageBuffer = readFileSync(testImagePath)
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
      formData.append('file', imageBlob, `test-photo-${i}.jpg`)

      // Act
      const response = await fetch(
        `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data: UploadPhotoResponse = await response.json()
      photoIds.push(data.id)
    }

    // Assert: All photo IDs should be unique
    const uniqueIds = new Set(photoIds)
    expect(uniqueIds.size).toBe(3)
  })

  it('should return stable storage URLs for uploaded files', async () => {
    // Arrange: Upload photo
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo.jpg')

    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    const data: UploadPhotoResponse = await response.json()

    // Act: Try to access uploaded file via returned URL
    const fileResponse = await fetch(data.url)

    // Assert: File should be publicly accessible
    expect(fileResponse.status).toBe(200)
    expect(fileResponse.headers.get('content-type')).toMatch(/image\/(jpeg|jpg)/)
  })
})

/*
 * NOTE: This is a CONTRACT TEST - it defines the API interface.
 * Implementation will be added in Phase 3 (tasks.md execution).
 *
 * When implementing:
 * 1. Create API route: src/app/api/onboarding/sessions/[sessionId]/products/[productId]/photos/route.ts
 * 2. Implement POST handler with multipart/form-data parsing
 * 3. Validate file type (JPEG/PNG/WebP) and size (<= 10 MB)
 * 4. Upload to Supabase Storage: onboarding-photos/{sessionId}/products/{productId}/{photoId}.{ext}
 * 5. Return UploadedFile interface (consistent with Step 12 Business Assets)
 *    - id, fileName, fileSize, mimeType, url, width, height, uploadedAt
 *
 * These tests should FAIL until implementation is complete (TDD approach).
 */
