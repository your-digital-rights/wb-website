/**
 * API Route: Upload Product Photo
 * Feature: 002-improved-products-service
 *
 * POST /api/onboarding/sessions/{sessionId}/products/{productId}/photos
 * Uploads a photo for a specific product
 */

import { NextRequest, NextResponse } from 'next/server'
import { uploadProductPhoto } from '@/services/supabase/storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string; productId: string } }
) {
  try {
    const { sessionId, productId } = params

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }
    if (!uuidRegex.test(productId)) {
      return NextResponse.json(
        { error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Upload photo to storage
    const uploadedFile = await uploadProductPhoto(sessionId, productId, file)

    // Return success response matching contract
    return NextResponse.json({
      id: uploadedFile.id,
      fileName: uploadedFile.fileName,
      fileSize: uploadedFile.fileSize,
      mimeType: uploadedFile.mimeType,
      url: uploadedFile.url,
      width: uploadedFile.width,
      height: uploadedFile.height,
      uploadedAt: uploadedFile.uploadedAt
    })
  } catch (error: any) {
    console.error('Photo upload API error:', error)

    // Handle specific error messages
    if (error.message?.includes('not supported') || error.message?.includes('JPEG')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error.message?.includes('exceed')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to upload product photo' },
      { status: 500 }
    )
  }
}
