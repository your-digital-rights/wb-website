/**
 * Contract Test: Update Onboarding Session with Products
 *
 * Tests the API contract for updating an onboarding session with product data.
 * This test ensures the request/response schema remains consistent.
 *
 * Endpoint: PATCH /api/onboarding/sessions/{sessionId}
 * Purpose: Save product data during auto-save or manual save
 */

import { describe, it, expect, beforeAll } from '@jest/globals'

// Types (will be implemented in src/types/onboarding.ts)
interface Product {
  id: string
  name: string
  description: string
  price?: number
  photos: UploadedFile[]
  displayOrder: number
  createdAt: string
  updatedAt: string
}

interface UploadedFile {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  width?: number
  height?: number
  uploadedAt: string
}

interface UpdateSessionRequest {
  formData: {
    products: Product[]
  }
  currentStep: number
}

interface UpdateSessionResponse {
  sessionId: string
  lastSaved: string
  success: boolean
}

describe('Contract: Update Session with Products', () => {
  let testSessionId: string
  let apiBaseUrl: string

  beforeAll(() => {
    // Setup test environment
    apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3783'
    testSessionId = 'test-session-' + Date.now()
  })

  it('should accept valid product data and return success', async () => {
    // Arrange: Valid request payload
    const request: UpdateSessionRequest = {
      formData: {
        products: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Web Design Service',
            description: 'Professional website design tailored to your business needs.',
            price: 1500.00,
            photos: [],
            displayOrder: 0,
            createdAt: '2025-11-20T10:30:00.000Z',
            updatedAt: '2025-11-20T10:30:00.000Z'
          }
        ]
      },
      currentStep: 11
    }

    // Act: Make API request
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert: Response contract
    expect(response.status).toBe(200)

    const data: UpdateSessionResponse = await response.json()

    expect(data).toMatchObject({
      sessionId: expect.any(String),
      lastSaved: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/), // ISO 8601
      success: true
    })
  })

  it('should accept product with photos and return success', async () => {
    // Arrange: Product with complete photo data (using UploadedFile interface)
    const request: UpdateSessionRequest = {
      formData: {
        products: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Premium Package',
            description: 'Comprehensive website solution with all features included.',
            price: 2500.00,
            photos: [
              {
                id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
                fileName: 'product-photo-1.jpg',
                fileSize: 245678,
                mimeType: 'image/jpeg',
                url: 'https://project.supabase.co/storage/v1/object/public/onboarding-photos/test/products/550e8400/7c9e6679.jpg',
                width: 1200,
                height: 800,
                uploadedAt: '2025-11-20T10:30:00.000Z'
              },
              {
                id: '8d7f5568-8536-51ef-b827-f18fd2g01bf8',
                fileName: 'product-photo-2.png',
                fileSize: 389012,
                mimeType: 'image/png',
                url: 'https://project.supabase.co/storage/v1/object/public/onboarding-photos/test/products/550e8400/8d7f5568.png',
                width: 1920,
                height: 1080,
                uploadedAt: '2025-11-20T10:31:00.000Z'
              }
            ],
            displayOrder: 0,
            createdAt: '2025-11-20T10:30:00.000Z',
            updatedAt: '2025-11-20T10:35:00.000Z'
          }
        ]
      },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert
    expect(response.status).toBe(200)
    const data: UpdateSessionResponse = await response.json()
    expect(data.success).toBe(true)
  })

  it('should accept empty products array (skip product entry)', async () => {
    // Arrange: Empty products array
    const request: UpdateSessionRequest = {
      formData: {
        products: []
      },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert: Should accept empty array (user skipped products)
    expect(response.status).toBe(200)
    const data: UpdateSessionResponse = await response.json()
    expect(data.success).toBe(true)
  })

  it('should reject invalid session ID format', async () => {
    // Arrange: Invalid session ID
    const invalidSessionId = 'not-a-valid-id'
    const request: UpdateSessionRequest = {
      formData: { products: [] },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${invalidSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert: Should return error
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  })

  it('should reject product with invalid name (too short)', async () => {
    // Arrange: Product with name < 3 characters
    const request: UpdateSessionRequest = {
      formData: {
        products: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'AB', // Invalid: too short
            description: 'Valid description with enough characters.',
            displayOrder: 0,
            photos: [],
            createdAt: '2025-11-20T10:30:00.000Z',
            updatedAt: '2025-11-20T10:30:00.000Z'
          }
        ]
      },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert: Should return validation error
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/name must be at least 3 characters/i)
  })

  it('should reject product with invalid description (too long)', async () => {
    // Arrange: Product with description > 100 characters
    const request: UpdateSessionRequest = {
      formData: {
        products: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'Valid Name',
            description: 'A'.repeat(101), // Invalid: too long
            displayOrder: 0,
            photos: [],
            createdAt: '2025-11-20T10:30:00.000Z',
            updatedAt: '2025-11-20T10:30:00.000Z'
          }
        ]
      },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/description cannot exceed 100 characters/i)
  })

  it('should reject more than 6 products', async () => {
    // Arrange: 7 products (exceeds limit)
    const products: Product[] = Array.from({ length: 7 }, (_, i) => ({
      id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}`,
      name: `Product ${i + 1}`,
      description: 'Valid description with enough characters for validation.',
      displayOrder: i,
      photos: [],
      createdAt: '2025-11-20T10:30:00.000Z',
      updatedAt: '2025-11-20T10:30:00.000Z'
    }))

    const request: UpdateSessionRequest = {
      formData: { products },
      currentStep: 11
    }

    // Act
    const response = await fetch(`${apiBaseUrl}/api/onboarding/sessions/${testSessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    // Assert
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/maximum 6 products/i)
  })
})

/*
 * NOTE: This is a CONTRACT TEST - it defines the API interface.
 * Implementation will be added in Phase 3 (tasks.md execution).
 *
 * When implementing:
 * 1. Create API route: src/app/api/onboarding/sessions/[sessionId]/route.ts
 * 2. Implement PATCH handler with Zod validation (ProductSchema + UploadedFileSchema)
 * 3. Update onboarding_sessions.products JSONB column in Supabase
 * 4. Return standardized response format
 * 5. Product photos use UploadedFile interface (consistent with Step 12)
 *
 * These tests should FAIL until implementation is complete (TDD approach).
 */
