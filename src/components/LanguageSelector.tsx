"use client"

import * as React from "react"
import { Globe } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter, usePathname } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { locales, type Locale } from "@/lib/i18n"

export function LanguageSelector() {
  const t = useTranslations('nav.language')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: Locale) => {
    // Use localized router which handles "as-needed" locale prefix strategy
    router.replace(pathname, { locale: newLocale })
  }

  const getLocaleName = (loc: Locale) => {
    switch (loc) {
      case 'en': return t('english')
      case 'it': return t('italian')
      case 'pl': return t('polish')
      default: return loc
    }
  }

  const getFlagCode = (loc: Locale) => {
    // Map locale codes to flag-icons country codes
    switch (loc) {
      case 'en': return 'us'
      case 'it': return 'it'
      case 'pl': return 'pl'
      default: return loc
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Globe className="h-4 w-4" />
          <span className="sr-only">Select language</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          {locales.map((loc) => (
            <Button
              key={loc}
              variant={locale === loc ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => switchLocale(loc)}
            >
              <span className={`fi fi-${getFlagCode(loc)} mr-2`} />
              {getLocaleName(loc)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}