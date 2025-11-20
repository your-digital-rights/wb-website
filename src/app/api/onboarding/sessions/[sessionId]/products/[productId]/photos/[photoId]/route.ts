/**
 * API Route: Delete Product Photo
 * Feature: 002-improved-products-service
 *
 * DELETE /api/onboarding/sessions/{sessionId}/products/{productId}/photos/{photoId}
 * Deletes a specific product photo from storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { deleteProductPhoto } from '@/services/supabase/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string; productId: string; photoId: string } }
) {
  try {
    const { sessionId, productId, photoId } = params

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
    if (!uuidRegex.test(photoId)) {
      return NextResponse.json(
        { error: 'Invalid photo ID format' },
        { status: 400 }
      )
    }

    // Delete photo from storage
    await deleteProductPhoto(sessionId, productId, photoId)

    // Return success response matching contract
    return NextResponse.json({
      success: true
    })
  } catch (error: any) {
    console.error('Photo deletion API error:', error)

    // If photo not found, still return success (idempotent delete)
    if (error.message?.includes('not found')) {
      return NextResponse.json({
        success: true
      })
    }

    return NextResponse.json(
      { error: 'Failed to delete product photo' },
      { status: 500 }
    )
  }
}
