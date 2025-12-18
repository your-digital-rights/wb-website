import { NextRequest, NextResponse } from 'next/server'

/**
 * API route to get user's country based on Vercel geolocation headers
 * Returns detected country for business registration
 */
export async function GET(request: NextRequest) {
  // Vercel provides geolocation headers
  // https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
  const countryCode = request.headers.get('x-vercel-ip-country') || 'IT'

  // Map country code to our supported countries
  // Support Italy (IT) and Poland (PL)
  let detectedCountry: 'Italy' | 'Poland' = 'Italy'

  if (countryCode === 'PL') {
    detectedCountry = 'Poland'
  }

  return NextResponse.json({
    countryCode,
    detectedCountry
  })
}
