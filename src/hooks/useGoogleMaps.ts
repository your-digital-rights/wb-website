'use client'

import { useEffect, useState } from 'react'
import { loadGoogleMapsAPI, isGoogleMapsLoaded } from '@/lib/google-maps-loader'

interface UseGoogleMapsOptions {
  enabled?: boolean
  language?: string
}

interface UseGoogleMapsResult {
  isLoaded: boolean
  isLoading: boolean
  error: Error | null
}

/**
 * Hook to load Google Maps API
 * Automatically loads the API when the component mounts
 * Returns loading state and any errors
 */
export function useGoogleMaps(options: UseGoogleMapsOptions = {}): UseGoogleMapsResult {
  const { enabled = true, language = 'en' } = options
  const [isLoaded, setIsLoaded] = useState(isGoogleMapsLoaded())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    // If already loaded, no need to load again
    if (isGoogleMapsLoaded()) {
      return
    }

    // Start loading
    setIsLoading(true)

    loadGoogleMapsAPI({ language })
      .then(() => {
        setIsLoaded(true)
        setIsLoading(false)
        setError(null)
      })
      .catch((err) => {
        console.warn('Google Maps API failed to load, falling back to manual entry:', err.message)
        setIsLoaded(false)
        setIsLoading(false)
        setError(err)
      })
  }, [enabled, language])

  return { isLoaded, isLoading, error }
}
