"use client"

import * as React from "react"
import { Link, useRouter } from "@/i18n/navigation"
import { useParams, usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Menu, X as CloseIcon } from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LanguageSelector } from "@/components/LanguageSelector"
import { WhiteBoarLogo } from "@/components/WhiteBoarLogo"
import { slideFade } from "../../context/design-system/motion/variants"
import { trackSelectItem } from "@/lib/analytics"

export function Navigation() {
  const params = useParams<{ locale?: string }>()
  const locale = (params?.locale ?? 'en') as string
  const t = useTranslations('nav')
  const shouldReduce = useReducedMotion()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const variants = shouldReduce ? {} : {
    nav: slideFade('right')
  }

  // Check if we're on the homepage (accounting for locale prefix)
  const isHomepage = pathname === '/' || pathname === `/${locale}` || pathname === `/${locale}/`

  const scrollToSection = (sectionId: string) => {
    if (isHomepage) {
      // On homepage, scroll to section
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    } else {
      // On other pages, navigate to homepage with hash
      router.push(`/#${sectionId}`)
    }
  }

  // Close mobile menu when screen size changes to desktop
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <motion.nav
      className="sticky top-0 z-50 w-full bg-white/70 dark:bg-black/70 backdrop-blur-md border-b border-gray-200/20 dark:border-gray-800/20"
      variants={variants.nav}
      initial="hidden"
      animate="show"
      aria-label="Main navigation"
    >
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
              <WhiteBoarLogo
                width={120}
                height={40}
                className="text-accent dark:text-accent"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              <button
                data-testid="nav-services-btn"
                onClick={() => scrollToSection('pricing')}
                className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {t('services')}
              </button>
              <button
                data-testid="nav-clients-btn"
                onClick={() => scrollToSection('portfolio')}
                className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {t('clients')}
              </button>
              <Link
                href="/contact"
                data-testid="nav-contact-link"
                className="text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {t('contact')}
              </Link>
            </div>

            {/* CTA Button */}
            <Button asChild data-testid="nav-start-cta" onClick={() => trackSelectItem('fast_simple', 'nav')}>
              <Link href="/onboarding">{t('start')}</Link>
            </Button>

            {/* Language Controls */}
            <div className="flex items-center space-x-2">
              <LanguageSelector />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-white"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200/20 dark:border-gray-800/20 bg-white/95 dark:bg-black/95 backdrop-blur-md">
            <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="space-y-4">
                {/* Mobile Navigation Links */}
                <div className="space-y-2">
                  <button
                    data-testid="nav-services-btn"
                    onClick={() => {
                      scrollToSection('pricing')
                      setMobileMenuOpen(false)
                    }}
                    className="block w-full text-left text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    {t('services')}
                  </button>
                  <button
                    data-testid="nav-clients-btn"
                    onClick={() => {
                      scrollToSection('portfolio')
                      setMobileMenuOpen(false)
                    }}
                    className="block w-full text-left text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    {t('clients')}
                  </button>
                  <Link
                    href="/contact"
                    data-testid="nav-contact-link"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-left text-gray-700 dark:text-white hover:text-gray-900 dark:hover:text-accent px-3 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    {t('contact')}
                  </Link>
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <LanguageSelector />
                  </div>
                </div>

                {/* Mobile CTA */}
                <div className="px-3">
                  <Button asChild className="w-full" onClick={() => trackSelectItem('fast_simple', 'nav_mobile')}>
                    <Link href="/onboarding" onClick={() => setMobileMenuOpen(false)}>
                      {t('start')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.nav>
  )
}
