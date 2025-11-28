/**
 * Contract Test: Delete Product Photo
 *
 * Tests the API contract for deleting product photos from Supabase Storage.
 * This test ensures deletion confirmation and cleanup behavior.
 *
 * Endpoint: DELETE /api/onboarding/sessions/{sessionId}/products/{productId}/photos/{photoId}
 * Purpose: Delete photo file from storage and remove reference
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { readFileSync } from 'fs'
import { join } from 'path'

interface DeletePhotoResponse {
  success: boolean
}

describe('Contract: Delete Product Photo', () => {
  let testSessionId: string
  let testProductId: string
  let testPhotoId: string
  let testPhotoUrl: string
  let apiBaseUrl: string

  beforeAll(async () => {
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3783'
    testSessionId = 'test-session-' + Date.now()
    testProductId = '550e8400-e29b-41d4-a716-446655440000'

    // Upload a test photo first (prerequisite for deletion tests)
    const testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo-to-delete.jpg')

    const uploadResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    const uploadData = await uploadResponse.json()
    testPhotoId = uploadData.photoId
    testPhotoUrl = uploadData.url
  })

  afterAll(async () => {
    // Cleanup: Delete test session data
    // (Implement session cleanup endpoint or manual DB cleanup)
  })

  it('should successfully delete existing photo', async () => {
    // Act: Delete photo
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${testPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert: Response contract
    expect(response.status).toBe(200)

    const data: DeletePhotoResponse = await response.json()
    expect(data).toEqual({
      success: true
    })
  })

  it('should remove photo from storage after deletion', async () => {
    // Arrange: Upload a new photo
    const testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-photo-for-storage-check.jpg')

    const uploadResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    const uploadData = await uploadResponse.json()
    const photoId = uploadData.photoId
    const photoUrl = uploadData.url

    // Verify photo exists before deletion
    const existsResponse = await fetch(photoUrl)
    expect(existsResponse.status).toBe(200)

    // Act: Delete photo
    const deleteResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoId}`,
      {
        method: 'DELETE'
      }
    )

    expect(deleteResponse.status).toBe(200)

    // Assert: Photo no longer accessible in storage
    // Note: May take a few seconds for deletion to propagate
    await new Promise(resolve => setTimeout(resolve, 2000))

    const notFoundResponse = await fetch(photoUrl)
    expect(notFoundResponse.status).toBe(404)
  })

  it('should return 404 for non-existent photo', async () => {
    // Arrange: Non-existent photo ID
    const nonExistentPhotoId = '00000000-0000-0000-0000-000000000000'

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${nonExistentPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert: Should return 404 Not Found
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toMatch(/photo not found/i)
  })

  it('should return 404 for non-existent product', async () => {
    // Arrange: Non-existent product ID
    const nonExistentProductId = '00000000-0000-0000-0000-000000000000'

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${nonExistentProductId}/photos/${testPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toMatch(/product not found/i)
  })

  it('should return 404 for non-existent session', async () => {
    // Arrange: Non-existent session ID
    const nonExistentSessionId = 'non-existent-session'

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${nonExistentSessionId}/products/${testProductId}/photos/${testPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toMatch(/session not found/i)
  })

  it('should be idempotent (safe to delete twice)', async () => {
    // Arrange: Upload a photo
    const testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-idempotent.jpg')

    const uploadResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    const uploadData = await uploadResponse.json()
    const photoId = uploadData.photoId

    // Act: Delete photo first time
    const firstDeleteResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoId}`,
      {
        method: 'DELETE'
      }
    )

    expect(firstDeleteResponse.status).toBe(200)

    // Act: Delete photo second time (already deleted)
    const secondDeleteResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert: Should return 404 (photo no longer exists)
    expect(secondDeleteResponse.status).toBe(404)
  })

  it('should reject invalid photo ID format', async () => {
    // Arrange: Invalid UUID format
    const invalidPhotoId = 'not-a-uuid'

    // Act
    const response = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${invalidPhotoId}`,
      {
        method: 'DELETE'
      }
    )

    // Assert: Should return 400 Bad Request
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/invalid.*id/i)
  })

  it('should delete photo and update product photos array', async () => {
    // Arrange: Create product with 3 photos
    const photoIds: string[] = []

    for (let i = 0; i < 3; i++) {
      const testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
      const formData = new FormData()
      const imageBuffer = readFileSync(testImagePath)
      const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
      formData.append('file', imageBlob, `test-photo-${i}.jpg`)

      const uploadResponse = await fetch(
        `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
        {
        method: 'POST',
          body: formData
        }
      )

      const uploadData = await uploadResponse.json()
      photoIds.push(uploadData.photoId)
    }

    // Act: Delete middle photo
    const deleteResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoIds[1]}`,
      {
        method: 'DELETE'
      }
    )

    expect(deleteResponse.status).toBe(200)

    // Assert: Get product data and verify photos array updated
    const sessionResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`,
      {
        method: 'GET'
      }
    )

    const sessionData = await sessionResponse.json()
    const product = sessionData.formData.products.find((p: any) => p.id === testProductId)

    // Should have 2 photos remaining (deleted middle one)
    expect(product.photos.length).toBe(2)
    expect(product.photos.map((p: any) => p.id)).not.toContain(photoIds[1])
  })

  it('should handle concurrent delete requests gracefully', async () => {
    // Arrange: Upload a photo
    const testImagePath = join(__dirname, '../../../__tests__/fixtures/test-image.jpg')
    const formData = new FormData()
    const imageBuffer = readFileSync(testImagePath)
    const imageBlob = new Blob([imageBuffer], { type: 'image/jpeg' })
    formData.append('file', imageBlob, 'test-concurrent.jpg')

    const uploadResponse = await fetch(
      `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos`,
      {
        method: 'POST',
        body: formData
      }
    )

    const uploadData = await uploadResponse.json()
    const photoId = uploadData.photoId

    // Act: Send two concurrent delete requests
    const [response1, response2] = await Promise.all([
      fetch(
        `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoId}`,
        { method: 'DELETE' }
      ),
      fetch(
        `${apiBaseUrl}/api/onboarding/sessions/${testSessionId}/products/${testProductId}/photos/${photoId}`,
        { method: 'DELETE' }
      )
    ])

    // Assert: One should succeed (200), one should fail (404)
    const statuses = [response1.status, response2.status].sort()
    expect(statuses).toEqual([200, 404])
  })
})

/*
 * NOTE: This is a CONTRACT TEST - it defines the API interface.
 * Implementation will be added in Phase 4 (tasks.md execution).
 *
 * When implementing:
 * 1. Create API route: src/app/api/onboarding/sessions/[sessionId]/products/[productId]/photos/[photoId]/route.ts
 * 2. Implement DELETE handler
 * 3. Validate photoId format (UUID)
 * 4. Delete file from Supabase Storage
 * 5. Remove photo from product.photos array in database
 * 6. Handle idempotency (safe to delete twice)
 * 7. Return standardized response format
 *
 * These tests should FAIL until implementation is complete (TDD approach).
 */
