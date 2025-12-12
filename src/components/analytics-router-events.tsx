'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function AnalyticsRouterEvents() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams?.toString()
    const page_path = query ? `${pathname}?${query}` : pathname

    ;(window as any).dataLayer = (window as any).dataLayer || []
    ;(window as any).dataLayer.push({
      event: 'wb_page_view',
      page_location: window.location.href,
      page_title: document.title,
      page_path,
    })
  }, [pathname, searchParams])

  return null
}
