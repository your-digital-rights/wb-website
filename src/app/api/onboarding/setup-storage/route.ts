import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const bucketName = 'onboarding-uploads'

    // Check if bucket exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      console.error('Failed to list buckets:', listError)
      return NextResponse.json({ error: 'Failed to access storage' }, { status: 500 })
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName)

    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`)

      // Create the bucket
      const { data: bucketData, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['image/png', 'image/jpg', 'image/jpeg'],
        fileSizeLimit: 10485760 // 10MB
      })

      if (createError) {
        console.error('Failed to create bucket:', createError)
        return NextResponse.json({ error: 'Failed to create storage bucket' }, { status: 500 })
      }

      console.log(`Bucket created successfully:`, bucketData)
    }

    // Set up bucket policies for secure access
    const policies = [
      {
        name: `onboarding-uploads-insert-policy`,
        definition: `(auth.role() = 'authenticated')`
      },
      {
        name: `onboarding-uploads-select-policy`,
        definition: `(auth.role() = 'authenticated')`
      }
    ]

    return NextResponse.json({
      success: true,
      message: `Storage bucket "${bucketName}" is ready`,
      bucketExists: bucketExists,
      created: !bucketExists
    })

  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}