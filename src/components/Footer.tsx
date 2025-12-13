"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { CookiePreferences } from "@/components/CookiePreferences"
import { WhiteBoarLogo } from "@/components/WhiteBoarLogo"

export function Footer() {
  const t = useTranslations('footer')
  const navT = useTranslations('nav')
  const [showCookiePreferences, setShowCookiePreferences] = React.useState(false)

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4" data-testid="footer-brand">
            <div data-testid="footer-brand-logo">
              <WhiteBoarLogo
                width={120}
                height={40}
                className="text-accent dark:text-accent"
              />
            </div>
            <p
              className="text-gray-600 dark:text-gray-400 max-w-sm"
              data-testid="footer-brand-description"
            >
              {t('brandDescription')}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4 md:mx-auto" data-testid="footer-quick-links">
            <h3
              className="font-heading font-semibold text-gray-900 dark:text-white"
              data-testid="footer-quick-links-heading"
            >
              {t('quickLinks')}
            </h3>
            <nav className="flex flex-col space-y-3" aria-label="Footer navigation">
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-left focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                data-testid="footer-link-services"
              >
                {navT('services')}
              </button>
              <button
                onClick={() => scrollToSection('portfolio')}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-left focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                data-testid="footer-link-clients"
              >
                {navT('clients')}
              </button>
              <Link
                href="/contact"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {navT('contact')}
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4 md:ml-auto" data-testid="footer-legal">
            <h3
              className="font-heading font-semibold text-gray-900 dark:text-white"
              data-testid="footer-legal-heading"
            >
              {t('legal')}
            </h3>
            <nav className="flex flex-col space-y-3" aria-label="Legal links">
              <Link
                href="/terms"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                data-testid="footer-link-terms"
              >
                {t('terms')}
              </Link>
              <Link
                href="/privacy"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                data-testid="footer-link-privacy"
              >
                {t('privacy')}
              </Link>
              <button
                onClick={() => setShowCookiePreferences(true)}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors text-left focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                data-testid="footer-manage-cookies-button"
              >
                {t('manageCookies')}
              </button>
            </nav>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-gray-600 dark:text-gray-300 text-sm">
            {t('copyright')}
          </p>
        </div>
      </div>

      <CookiePreferences
        open={showCookiePreferences}
        onOpenChange={setShowCookiePreferences}
        onSave={() => setShowCookiePreferences(false)}
      />
    </footer>
  )
}
