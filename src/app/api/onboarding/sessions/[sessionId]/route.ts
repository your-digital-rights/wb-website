/**
 * API Route: Update Onboarding Session
 * Feature: 002-improved-products-service
 *
 * PATCH /api/onboarding/sessions/{sessionId}
 * Updates onboarding session with form data (including products)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ProductsArraySchema } from '@/lib/validation/product-schema'

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface UpdateSessionRequest {
  formData: {
    products?: any[]
    [key: string]: any
  }
  currentStep: number
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
        { status: 400 }
      )
    }

    const body: UpdateSessionRequest = await request.json()

    // Validate request body structure
    if (!body.formData || typeof body.currentStep !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request body. Required: formData, currentStep' },
        { status: 400 }
      )
    }

    // Validate products array if present
    if (body.formData.products) {
      try {
        ProductsArraySchema.parse(body.formData.products)
      } catch (validationError: any) {
        // Extract first error message from Zod validation
        const firstError = validationError.errors?.[0]
        const errorMessage = firstError?.message || 'Invalid product data'

        return NextResponse.json(
          {
            error: errorMessage,
            details: validationError.errors
          },
          { status: 400 }
        )
      }
    }

    // Update session in database
    const { data, error } = await supabaseAdmin
      .from('onboarding_sessions')
      .update({
        form_data: body.formData,
        current_step: body.currentStep,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select('id, updated_at')
      .single()

    if (error) {
      console.error('Database update error:', error)
      return NextResponse.json(
        { error: 'Failed to update session', details: error.message },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Return success response matching contract
    return NextResponse.json({
      sessionId: data.id,
      lastSaved: data.updated_at,
      success: true
    })
  } catch (error) {
    console.error('Session update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error during session update' },
      { status: 500 }
    )
  }
}
